
import os
from dotenv import load_dotenv  # 
from typing import Annotated
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
 
from langchain_google_genai import ChatGoogleGenerativeAI
 
load_dotenv()
 
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")
 
llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=api_key   
)
 

class State(TypedDict):
    messages: Annotated[list, add_messages]


graph_builder = StateGraph(State)

def chatbot(state: State):
    return {"messages": [llm.invoke(state["messages"])]}


graph_builder.add_node("chatbot", chatbot)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_edge("chatbot", END)

graph = graph_builder.compile()
 
print("Bot ready! (Now with conversation history)")
print("=" * 50)
 
conversation_state = {"messages": []}

while True:
    try:
        user_input = input("You: ")
        if user_input.lower() in ["quit", "exit"]:
            break
        conversation_state["messages"].append({"role": "user", "content": user_input})
        result = graph.invoke(conversation_state)
        conversation_state = result
        print("Gemini:", conversation_state["messages"][-1].content)
        print()  

    except Exception as e:
        print(f"Error: {e}")

print("\nConversation ended. Goodbye!")
