const socket = io('http://localhost:3000');
const videoElement = document.getElementById('videoElement');
const streamKeyInput = document.getElementById('streamKeyInput');
const watchButton = document.getElementById('watchButton');

let peerConnection;

watchButton.addEventListener('click', watchStream);

function watchStream() {
    const streamId = streamKeyInput.value;
    if (!streamId) {
        alert('Please enter a stream key');
        return;
    }

    socket.emit('join', streamId);

    const peerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnection.ontrack = (event) => {
        videoElement.srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('icecandidate', streamId, event.candidate);
        }
    };

    socket.on('offer', (from, offer) => {
        peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
            .then(() => peerConnection.createAnswer())
            .then(answer => peerConnection.setLocalDescription(answer))
            .then(() => {
                socket.emit('answer', from, peerConnection.localDescription);
            });
    });

    socket.on('icecandidate', (from, candidate) => {
        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    });

    socket.on('broadcasterLeft', () => {
        videoElement.srcObject = null;
        alert('The broadcaster has left the stream.');
    });
}

socket.on('error', (message) => {
    alert(message);
});