import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const userId = "user123"; // Example user ID, this should be dynamically set per user session
const socket = io("http://localhost:5000", { query: { userId } });

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const screenRecorderRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const startRecordings = async () => {
    try {
      // Start screen recording
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const screenRecorder = new MediaRecorder(screenStream, {
        mimeType: "video/webm",
      });
      screenRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socket.emit("screen_data", event.data);
        }
      };
      screenRecorder.start(1000); // Collect 1 second chunks of screen video
      screenRecorderRef.current = screenRecorder;

      // Start audio/video recording
      const avStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const avRecorder = new MediaRecorder(avStream, {
        mimeType: "video/webm",
      });
      avRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socket.emit("video_data", event.data);
        }
      };
      avRecorder.start(1000); // Collect 1 second chunks of AV
      mediaRecorderRef.current = avRecorder;

      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recordings:", error);
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
    socket.emit("stop_recording");
  };

  return (
    <div>
      <button onClick={isRecording ? stopRecordings : startRecordings}>
        {isRecording ? "Stop Recordings" : "Start Recordings"}
      </button>
    </div>
  );
}

export default App;
