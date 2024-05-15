import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const screenRecorderRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.error("User ID not found in localStorage");
      return;
    }

    socketRef.current = io("http://localhost:5000", { query: { userId } });

    socketRef.current.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setError("Connection error. Please check your network and try again.");
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const startRecordings = async () => {
    try {
      setError(null);
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1280, height: 720, frameRate: 15 },
      });
      const screenRecorder = new MediaRecorder(screenStream, {
        mimeType: "video/webm",
        videoBitsPerSecond: 600000,
      });
      screenRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socketRef.current.emit("screen_data", event.data);
        }
      };
      screenRecorder.start(1000);
      screenRecorderRef.current = screenRecorder;

      const avStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, frameRate: 15 },
        audio: true,
      });
      const avRecorder = new MediaRecorder(avStream, {
        mimeType: "video/webm",
        videoBitsPerSecond: 600000,
      });
      avRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socketRef.current.emit("video_data", event.data);
        }
      };
      avRecorder.start(1000);
      mediaRecorderRef.current = avRecorder;

      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recordings:", error);
      setError(
        "Error starting recordings. Please check your permissions and try again."
      );
    }
  };

  const stopRecordings = () => {
    if (screenRecorderRef.current) {
      screenRecorderRef.current.stop();
      screenRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      screenRecorderRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream
        .getTracks()
        .forEach((track) => track.stop());
      mediaRecorderRef.current = null;
    }
    setIsRecording(false);
    socketRef.current.emit("stop_recording");
  };

  return (
    <div>
      <button onClick={isRecording ? stopRecordings : startRecordings}>
        {isRecording ? "Stop Recordings" : "Start Recordings"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </div>
  );
}

export default App;
