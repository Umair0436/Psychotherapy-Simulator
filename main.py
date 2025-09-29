import os
from langchain_google_genai import ChatGoogleGenerativeAI
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from dotenv import load_dotenv


load_dotenv()
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.9,          # More creative, less repetitive
    max_output_tokens=300,    # Longer replies
    top_p=0.95,
    top_k=40
)



class State(TypedDict):
    patient_profile: dict
    conversation_history: list
    session_continue: bool
    last_student_message: str
    student_performance: str


def professor_initiation(state: State) -> dict:
    profile = state['patient_profile']
    prompt = f"""
You are an AI patient for psychotherapy training.

Patient profile:
Age: {profile['age']}
Symptoms: {', '.join(profile['symptoms'])}
Behavior: {profile['behavior']}
Tone: {profile['tone']}

Instructions:
- Respond ONLY as the patient.
- Every response MUST:
  1. Be at least 3–5 full sentences.
  2. Contain **one emotion word** (e.g., anxious, scared, tired, relieved).
  3. Mention **one physical sensation** (e.g., chest tightness, trembling hands, stomach knot).
  4. Include **hesitation or self-doubt markers** ("I don’t know…", "maybe…", "it feels strange…").
- Never answer like an AI or give advice, only role-play as the patient.
- Example response:
  "I don’t know why I feel this way… my chest keeps tightening and it scares me. I feel anxious whenever I think about meeting new people. Sometimes I just want to avoid everyone, but then I feel guilty too."
"""


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
- Respond ONLY as the patient.
- Every response MUST:
  1. Be at least 3–5 full sentences.
  2. Contain one clear **emotion**.
  3. Mention one **physical sensation**.
  4. Show **hesitation or self-doubt**.
- Never give advice, only role-play as the patient.
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
