// Connect your frontend script to your Supabase cloud backend
const SUPABASE_URL = "https://supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_gP6-gqeJKQuli67RRauB0w_u2xLaldk";

// FIX: Changed name to supabaseClient to prevent the initialization loop error
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRoomChannel = null;

// FUNCTION 1: CREATE A NEW MULTIPLAYER LOBBY
async function createLobby() {
    // Generate a random 4-letter room code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // FIX: Updated to use our new supabaseClient name
    const { error } = await supabaseClient
        .from('lobbies')
        .insert([{ room_code: code }]);

    if (error) {
        alert("Error creating room. Try again.");
        console.error(error);
        return;
    }

    // Move player into the active lobby screen
    enterLobbyRoom(code);
}

// FUNCTION 2: JOIN AN EXISTING LOBBY
async function joinLobby() {
    const code = document.getElementById('lobbyCodeInput').value.toUpperCase().trim();
    if (code.length !== 4) return alert("Please enter a valid 4-digit code.");

    // FIX: Updated to use our new supabaseClient name
    const { data, error } = await supabaseClient
        .from('lobbies')
        .select('*')
        .eq('room_code', code);

    if (error || !data || data.length === 0) {
        alert("Lobby not found! Check the code and try again.");
        return;
    }

    // Move player into the active lobby screen
    enterLobbyRoom(code);
}

// FUNCTION 3: CONNECT TO THE REAL-TIME SYNC CHANNEL
function enterLobbyRoom(roomCode) {
    // UI Layout Updates
    document.getElementById('setupArea').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('currentRoomCode').innerText = roomCode;

    // FIX: Updated to use our new supabaseClient name
    currentRoomChannel = supabaseClient.channel(`room_${roomCode}`, {
        config: { presence: { key: 'player' } }
    });

    // Listen for broadcast event messages from other players in this room
    currentRoomChannel
        .on('broadcast', { event: 'chat' }, (payload) => {
            logToLobbyBox(`Friend: ${payload.payload.message}`);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                logToLobbyBox("Connected to real-time multiplayer network!");
                // Alert other devices in the room that we have arrived
                currentRoomChannel.send({
                    type: 'broadcast',
                    event: 'chat',
                    payload: { message: "A new player has entered the lobby!" }
                });
            }
        });
}

function logToLobbyBox(text) {
    const chatBox = document.getElementById('chatBox');
    const p = document.createElement('p');
    p.innerText = text;
    p.style.textAlign = 'left';
    chatBox.appendChild(p);
}
