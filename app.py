from flask import Flask, request, jsonify, send_from_directory
from main import initial_state, app as graph_app, State  # import your LangGraph app

server = Flask(__name__, static_folder="")  # serve current folder files
server.config['JSONIFY_PRETTYPRINT_REGULAR'] = True

# Keep a single session state
session_state = initial_state

@server.route('/')
def index():
    return send_from_directory('', 'index.html')

@server.route('/style.css')
def css():
    return send_from_directory('', 'style.css')

@server.route('/send_message', methods=['POST'])
def send_message():
    global session_state
    data = request.json
    msg = data.get('message', '')
    session_state['conversation_history'].append({"role": "student", "message": msg})

    # Call patient_agent to get response
    session_state = graph_app.invoke(session_state)
    
    # Get latest patient message
    patient_msgs = [m['message'] for m in session_state['conversation_history'] if m['role'] == 'patient']
    reply = patient_msgs[-1] if patient_msgs else "..."
    return jsonify({"reply": reply})

@server.route('/end_session', methods=['POST'])
def end_session():
    global session_state
    # Call feedback agent
    from main import feedback_agent
    session_state = feedback_agent(session_state)
    feedback = session_state.get('student_performance', "No feedback available")
    return jsonify({"feedback": feedback})

if __name__ == '__main__':
    server.run(debug=True)
