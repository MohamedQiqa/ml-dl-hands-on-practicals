

## **The Flow (Simplified)**
```
User input → graph.invoke(conversation_state)
                ↓
            [START node]
                ↓
            [chatbot node]
                ↓
            llm.invoke(state["messages"]) ← ACTUAL API CALL
                ↓
            [END node]
                ↓
            Returns updated state
```
```
graph.invoke(conversation_state)
    ↓
Executes the workflow: START → "chatbot" → END
    ↓
Calls chatbot(state) function
    ↓
Inside chatbot: llm.invoke(state["messages"]) runs
    ↓
Returns updated state back to you
```
## **In Other Words:**
1. **`graph.invoke()`** = "Hey graph, run the workflow!"
2. **Graph says:** "OK, I'll execute START → chatbot node → END"
3. **At the chatbot node:** Calls your `chatbot(state)` function
4. **Inside `chatbot()`:** `llm.invoke()` fires → talks to Gemini API
5. **Graph collects the result** and returns it
---
## **Key Insight**
`graph.invoke()` is the **orchestrator**—it doesn't directly call the LLM. It just:
- Follows the edges you defined (`START → chatbot → END`)
- Executes whatever function is attached to each node
- Manages state updates automatically

The actual **AI magic** happens inside `llm.invoke()` when the graph reaches the `"chatbot"` node.
---
