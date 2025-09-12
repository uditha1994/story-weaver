const firebaseConfig = {
    apiKey: "AIzaSyDg3u1uw1J_CsCL143jI1w5fq9U93TVO1c",
    authDomain: "story-weaver-667ba.firebaseapp.com",
    projectId: "story-weaver-667ba",
    storageBucket: "story-weaver-667ba.firebasestorage.app",
    messagingSenderId: "393894037893",
    appId: "1:393894037893:web:db2e9124b92e41edd41cec",
    measurementId: "G-2XBKTBQ9M8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// collection references
const storiesCollection = db.collection('stories');
const chaptersCollection = db.collection('chapters');

function handleFirebaseError(error) {
    console.error('Firebase Error: ', error);

    // Map firebase error code to user friendly message
    const errorMessages = {
        'permission-denied': 'You do not have permission to perform this action.',
        'unavailable': 'Service is currently unavailable. Please try again later.',
        'deadline-exceeded': 'Request timed out. Please check your connection.',
        'resource-exhausted': 'Too many requests. Please try again later.',
        'invalid-argument': 'Invalid data provided.',
        'not-found': 'Requested data not found.',
        'already-exists': 'This item already exists.',
        'failed-precondition': 'Operation failed due to current state.',
        'aborted': 'Operation was aborted.',
        'out-of-range': 'Value is out of valid range.',
        'unimplemented': 'This feature is not yet implemented.',
        'internal': 'Internal server error occurred.',
        'data-loss': 'Data loss occurred.',
        'unauthenticated': 'Authentication required.'
    };

    return errorMessages[error.code] || 'An unexpected error occurred. Please try again...'
}

async function testFirebaseConnection() {
    try {
        //try to read from firestore to test connection
        await db.collection('test').limit(1).get();
        console.log('Firebase connection successful');
        return true;
    } catch (error) {
        console.error('Firebase connection failed: ', error);
        return false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    testFirebaseConnection();
});

//export for use in other modules
window.firabseUtiles = {
    db,
    storiesCollection,
    chaptersCollection,
    handleFirebaseError,
    testFirebaseConnection
}