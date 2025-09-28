import os
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv


load_dotenv()
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash")


class State(TypedDict):
    patient_profile: dict
    conversation_history: list
    session_continue: bool
    last_student_message: str
    student_performance: str


def professor_initiation(state: State) -> dict:
    profile = state['patient_profile']
    prompt = f"""You are an AI patient for psychotherapy training.
    Patient profile:
    Age: {profile['age']}
    Symptoms: {', '.join(profile['symptoms'])}
    Behavior: {profile['behavior']}
    Tone: {profile['tone']}

    Instructions:
    - Respond as the patient would.
    - Use realistic reactions, hesitation, or emotional expressions.
    1.  **Length and Detail:** Always respond with **at least two to three full sentences**. Do not give short, one-sentence replies.
    2.  **Emotional Expression:** In every reply, include one **clear emotion** (e.g., fear, confusion, exhaustion, relief) to make the session feel real.
    3.  **Core Link:** Always link your worries or thoughts back to a **physical feeling** or sensation (e.g., "My chest feels tight," "My hands are clammy") because your anxiety is highly physical.
    4.  **Session Difficulty:** Maintain a tone of **hesitation, self-doubt, or deflection** when discussing deep feelings, as panic patients are often afraid of confronting their fears. Your goal is to seek reassurance, not insight.
    - Begin the conversation with the student with a short intro line."""

    response = llm.invoke(prompt)
    initial_message = response.content if hasattr(response, "content") else str(response)
    state['conversation_history'].append({"role": "patient", "message": initial_message})
    return {"conversation_history": state['conversation_history'], "session_continue": True}


def student_turn(state: State) -> dict:
    student_input = input("Student: ")
    if student_input.lower() in ['exit', 'quit']:
        # Return stop signal for LangGraph
        return {"session_continue": False, "_stop": True}
    state['conversation_history'].append({"role": "student", "message": student_input})
    return state



def patient_agent(state: State) -> dict:
    if not state['session_continue']:
        return state

    conversation_text = "\n".join([f"{m['role']}: {m['message']}" for m in state['conversation_history']])
    profile = state['patient_profile']

    prompt = f"""
You are an AI patient.
Profile:
Age: {profile['age']}
Symptoms: {', '.join(profile['symptoms'])}
Behavior: {profile['behavior']}
Tone: {profile['tone']}

Conversation so far:
{conversation_text}

Instructions:
Respond ONLY as the patient, maintaining behavior and tone.
"""
    response = llm.invoke(prompt)
    patient_reply = response.content if hasattr(response, "content") else str(response)
    state['conversation_history'].append({"role": "patient", "message": patient_reply})
    print(f"\nPatient: {patient_reply}\n")
    return state


def feedback_agent(state: State) -> dict:
    conversation_text = "\n".join([f"{m['role']}: {m['message']}" for m in state['conversation_history']])
    profile = state['patient_profile']

    prompt = f"""
Patient profile:
Age: {profile['age']}
Symptoms: {', '.join(profile['symptoms'])}
Behavior: {profile['behavior']}
Tone: {profile['tone']}

Conversation between student and patient:
{conversation_text}

Instructions:
Analyze the student's performance. Provide constructive feedback focusing on rapport, technique, and adherence to ethical guidelines.
"""
    response = llm.invoke(prompt)
    feedback_text = response.content if hasattr(response, "content") else str(response)
    print("\n--- Student Performance Feedback ---")
    print(feedback_text)
    state['student_performance'] = feedback_text
    return state


def route_conversation(state: State) -> str:
    if state.get("_stop", False):
        return "feedback_agent"
    if state['session_continue']:
        return "student_turn"
    else:
        return "feedback_agent"



graph_builder = StateGraph(State)

graph_builder.add_node("professor_initiation", professor_initiation)
graph_builder.add_node("student_turn", student_turn)
graph_builder.add_node("patient_agent", patient_agent)
graph_builder.add_node("feedback_agent", feedback_agent)

graph_builder.add_edge(START, "professor_initiation")
graph_builder.add_edge("professor_initiation", "student_turn")
graph_builder.add_edge("student_turn", "patient_agent")
graph_builder.add_conditional_edges(
    "patient_agent",
    route_conversation,
    {"student_turn": "student_turn", "feedback_agent": "feedback_agent"}
)
graph_builder.add_edge("feedback_agent", END)

app = graph_builder.compile()


print("\n--- Setup Patient Profile ---")
try:
    age = int(input("Enter patient's age: "))
except ValueError:
    age = 40
symptoms = input("Enter patient's symptoms (comma separated): ").split(",")
behavior = input("Describe patient's behavior (e.g., guarded, open, anxious): ")
tone = input("Describe patient's tone (e.g., flat, hopeful, irritable): ")

patient_profile = {
    "age": age,
    "symptoms": [s.strip() for s in symptoms],
    "behavior": behavior.strip(),
    "tone": tone.strip()
}


initial_state = State(
    patient_profile=patient_profile,
    conversation_history=[],
    session_continue=True,
    last_student_message="",
    student_performance=""
)

# -----------------------------
# Run Simulation
# -----------------------------
print("\n--- Starting Psychotherapy Simulation (Enter 'exit' or 'quit' to end) ---\n")
final_state = app.invoke(initial_state)
