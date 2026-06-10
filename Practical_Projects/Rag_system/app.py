import os
import json
from flask import Flask, request, jsonify
from typing import Annotated, Literal, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_community.llms import LlamaCpp
from langchain_core.documents import Document

app = Flask(__name__)
 
# Set STORAGE_PATH to the project directory by default
STORAGE_PATH = os.getenv("STORAGE_PATH", os.path.dirname(__file__))
MODEL_PATH = os.path.join(STORAGE_PATH, "phi-3-mini-4k-instruct.Q4_K_M.gguf")
DATA_PATH = os.path.join(STORAGE_PATH, "al_bdaya_course_assistant_dataset.json")
DB_PATH = os.path.join(STORAGE_PATH, "al_bdaya_local_db")
 
# Ensure the necessary directories exist
os.makedirs(DB_PATH, exist_ok=True)
os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)

llm = None
vector_db = None
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_resources(): 
    global llm, vector_db
    if llm is None:
        print(f"Loading Model from: {MODEL_PATH}")
        llm = LlamaCpp(model_path=MODEL_PATH, n_ctx=4096, n_gpu_layers=0, verbose=False)
    if vector_db is None:
        print(f"Loading DB from: {DB_PATH}")
        if os.path.exists(DB_PATH):
            vector_db = Chroma(persist_directory=DB_PATH, embedding_function=embeddings)
        else:
            with open(DATA_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
            docs = [Document(page_content=i["input"], metadata={"answer": i["output"]}) for i in data]
            vector_db = Chroma.from_documents(docs, embeddings, persist_directory=DB_PATH)
    return llm, vector_db
 
class State(TypedDict):
    messages: Annotated[list, add_messages]
    message_type: str | None
    next_step: str | None

def classifier_node(state: State):
    model, _ = get_resources()
    last_msg = state["messages"][-1].content
    prompt = f"<|system|>Classify as 'course', 'math', or 'general'.<|end|>\n<|user|>{last_msg}<|end|>\n<|assistant|>"
    decision = model.invoke(prompt).strip().lower()
    msg_type = "course" if "course" in decision else "math" if "math" in decision else "general"
    return {"message_type": msg_type}

def router_logic(state: State):
    msg_type = state.get("message_type", "general")
    return {"next_step": f"{msg_type}_agent"}

def course_agent(state: State):
    model, db = get_resources()
    query = state["messages"][-1].content
    results = db.similarity_search(query, k=2)
    context = "\n".join([r.metadata['answer'] for r in results])
    prompt = f"<|system|>Context: {context}<|end|>\n<|user|>{query}<|end|>\n<|assistant|>"
    return {"messages": [{"role": "assistant", "content": model.invoke(prompt)}]}

def math_agent(state: State):
    model, _ = get_resources()
    query = state["messages"][-1].content
    prompt = f"<|system|>Solve math step-by-step.<|end|>\n<|user|>{query}<|end|>\n<|assistant|>"
    return {"messages": [{"role": "assistant", "content": model.invoke(prompt)}]}

def general_agent(state: State):
    model, _ = get_resources()
    query = state["messages"][-1].content
    prompt = f"<|system|>You are a friendly assistant.<|end|>\n<|user|>{query}<|end|>\n<|assistant|>"
    return {"messages": [{"role": "assistant", "content": model.invoke(prompt)}]}
 
builder = StateGraph(State)
builder.add_node("classifier", classifier_node)
builder.add_node("router", router_logic)
builder.add_node("course_agent", course_agent)
builder.add_node("math_agent", math_agent)
builder.add_node("general_agent", general_agent)

builder.add_edge(START, "classifier")
builder.add_edge("classifier", "router")
builder.add_conditional_edges("router", lambda s: s["next_step"], 
                              {"course_agent": "course_agent", "math_agent": "math_agent", "general_agent": "general_agent"})
builder.add_edge("course_agent", END)
builder.add_edge("math_agent", END)
builder.add_edge("general_agent", END)
graph = builder.compile()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    history = data.get("history", [])
    user_input = data.get("message")
    inputs = {"messages": history + [{"role": "user", "content": user_input}]}
    result = graph.invoke(inputs)
    return jsonify({"response": result["messages"][-1].content, "type": result["message_type"]})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)))