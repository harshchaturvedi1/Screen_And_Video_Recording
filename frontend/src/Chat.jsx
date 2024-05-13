import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [recording, setRecording] = useState(false);
  const [savedFilename, setSavedFilename] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const checkMediaPermissions = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      return true; // Permissions granted
    } catch (error) {
      alert("Please allow access to audio and video to use this application.");
      return false; // Permissions not granted
    }
  };

  const startRecording = async () => {
    if (!checkMediaPermissions()) {
      return;
    }
    setSavedFilename(null);
    setRecording(true);
    const userMediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setStream(userMediaStream);
    videoRef.current.srcObject = userMediaStream;

    mediaRecorderRef.current = new MediaRecorder(userMediaStream);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        socket.emit("data", event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      socket.emit("stop");
      setStream(null);
    };

    socket.emit("start");
    mediaRecorderRef.current.start(100); // collect data in chunks of 100ms
  };

  const stopRecording = () => {
    setRecording(false);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    socket.on("saved", (filename) => {
      setSavedFilename(filename);
    });

    return () => {
      socket.off("saved");
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return (
    <div>
      <h1>Audio/Video Recording</h1>
      <video ref={videoRef} autoPlay muted width="320" height="240" />
      <div>
        <button onClick={startRecording} disabled={recording}>
          Start Recording
        </button>
        <button onClick={stopRecording} disabled={!recording}>
          Stop Recording
        </button>
      </div>

      {savedFilename && <p>Recording saved as {savedFilename}</p>}
    </div>
  );
}

export default App;
// comment
