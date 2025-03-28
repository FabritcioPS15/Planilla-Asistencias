import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCJwfuil9myBhr7Wbxaq85-KxloM5JwmrA",
  authDomain: "autenticaciones-4e6d7.firebaseapp.com",
  projectId: "autenticaciones-4e6d7",
  storageBucket: "autenticaciones-4e6d7.appspot.com",
  messagingSenderId: "574271017439",
  appId: "1:574271017439:web:xxxxxxxxxxxxxxxxxxxxxx"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
