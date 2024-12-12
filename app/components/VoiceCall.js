"use client";
import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const VoiceCall = () => {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(""); // Your static ID (e.g., phone number)
  const [userId2, setUserId2] = useState(false); // Your static ID (e.g., phone number)
  const [targetId, setTargetId] = useState(""); // Target's static ID
  const [incomingCall, setIncomingCall] = useState(null); // Caller ID for incoming calls
  const [isInCall, setIsInCall] = useState(false);
  const myAudioRef = useRef(null);
  const peerAudioRef = useRef(null);
  const peerRef = useRef(null); // For managing peer connection

  useEffect(() => {
    const newSocket = io("https://rtc-server-sepia.vercel.app/");
    setSocket(newSocket);

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      if (myAudioRef.current) myAudioRef.current.srcObject = stream;

      newSocket.on("incoming-call", ({ callerId }) => {
        console.log("Incoming call from:", callerId);
        setIncomingCall(callerId);
      });

      newSocket.on("offer", ({ offer, sender }) => {
        console.log("Received offer from:", sender);
        const peer = new Peer({ initiator: false, trickle: false, stream });

        peer.on("signal", (answer) => {
          console.log("Sending answer to:", sender);
          newSocket.emit("answer", { answer, callerId: sender });
        });

        peer.on("stream", (peerStream) => {
          if (peerAudioRef.current) peerAudioRef.current.srcObject = peerStream;
        });

        peer.signal(offer);
        peerRef.current = peer;
        setIsInCall(true);
      });

      newSocket.on("answer", ({ answer }) => {
        console.log("Received answer, connecting...");
        peerRef.current.signal(answer);
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const register = () => {
    if (userId && socket) {
      socket.emit("register", userId);
      console.log("Registered with ID:", userId);
      setUserId2(true);
    }
  };

  const initiateCall = () => {
    if (!targetId || !socket) {
      alert("Please enter a valid target ID!");
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const peer = new Peer({ initiator: true, trickle: false, stream });

      peer.on("signal", (offer) => {
        console.log("Sending offer to:", targetId);
        socket.emit("offer", { offer, target: targetId, sender: userId });
      });

      peer.on("stream", (peerStream) => {
        if (peerAudioRef.current) peerAudioRef.current.srcObject = peerStream;
      });

      peerRef.current = peer;
    });
  };

  const answerCall = () => {
    if (incomingCall && socket) {
      console.log("Answering call from:", incomingCall);
      setIncomingCall(null); // Clear incoming call notification
    }
  };

  return (
    <div>
      <h1>Voice Call App</h1>

      {!userId2 ? (
        <>
          <input
            type="text"
            placeholder="Enter your User ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="border rounded p-2 mb-2"
          />
          <button
            onClick={register}
            className="bg-green-500 text-white py-2 px-4 rounded"
          >
            Register
          </button>
        </>
      ) : (
        <>
          <p>Your ID: <strong>{userId}</strong></p>
          <input
            type="text"
            placeholder="Enter target User ID"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="border rounded p-2 mb-2"
          />
          <button
            onClick={initiateCall}
            className="bg-blue-500 text-white py-2 px-4 rounded"
          >
            Call User
          </button>
        </>
      )}

      {incomingCall && (
        <div>
          <p>Incoming call from: {incomingCall}</p>
          <button
            onClick={answerCall}
            className="bg-yellow-500 text-white py-2 px-4 rounded"
          >
            Answer
          </button>
        </div>
      )}

      <div className="mt-4">
        <audio ref={myAudioRef} autoPlay muted />
        <audio ref={peerAudioRef} autoPlay />
      </div>
    </div>
  );
};

export default VoiceCall;
