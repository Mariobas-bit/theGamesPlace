// Connect your frontend script to your Supabase cloud backend
const SUPABASE_URL = "YOUR_SUPABASE_URL"; 
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
const supabase = createClient.initializeSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentRoomChannel = null;

// FUNCTION 1: CREATE A NEW MULTIPLAYER LOBBY
async function createLobby() {
    // Generate a random 4-letter room code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    // Save this new room code inside the Supabase database
    const { error } = await supabase
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

    // Check the cloud database if this room code actually exists
    const { data, error } = await supabase
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

    // Create a live WebSocket broadcast channel named after our room code
    currentRoomChannel = supabase.channel(`room_${roomCode}`, {
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
