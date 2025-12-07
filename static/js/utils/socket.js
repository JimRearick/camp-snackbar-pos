/**
 * WebSocket connection utility
 */

// Initialize Socket.IO connection
export const socket = io();

// Connection event handlers
socket.on('connect', () => {
    console.log('WebSocket connected');
});

socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
});

socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error);
});
