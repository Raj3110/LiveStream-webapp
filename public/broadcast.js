const socket = io('http://localhost:3000');
const videoElement = document.getElementById('videoElement');
const startButton = document.getElementById('startButton');
const streamKeyElement = document.getElementById('streamKey');

let stream;
let peerConnections = {};

startButton.addEventListener('click', startBroadcasting);

async function startBroadcasting() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        videoElement.srcObject = stream;
        
        const streamId = Math.random().toString(36).substring(2, 15);
        socket.emit('create', streamId);

        socket.on('created', (id) => {
            streamKeyElement.textContent = `Stream Key: ${id}`;
            startButton.disabled = true;
        });
        
        socket.on('viewer', (viewerId) => {
            const peerConnection = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            peerConnections[viewerId] = peerConnection;

            stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));

            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('icecandidate', viewerId, event.candidate);
                }
            };

            peerConnection.createOffer()
                .then(offer => peerConnection.setLocalDescription(offer))
                .then(() => {
                    socket.emit('offer', viewerId, peerConnection.localDescription);
                });
        });

        socket.on('answer', (from, answer) => {
            peerConnections[from].setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on('icecandidate', (from, candidate) => {
            peerConnections[from].addIceCandidate(new RTCIceCandidate(candidate));
        });

    } catch (error) {
        console.error('Error accessing media devices:', error);
    }
}

socket.on('error', (message) => {
    alert(message);
});