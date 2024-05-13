import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [recording, setRecording] = useState(false);
  const [savedFilename, setSavedFilename] = useState(null);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);

  const startRecordingScreen = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm",
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          socket.emit("screen_data", event.data);
        }
      };

      mediaRecorder.start(1000); // Collect 1 second chunks of video
      setIsRecording(true);

      socket.on("stop_recording", () => {
        mediaRecorder.stop();
        stream.getTracks().forEach((track) => track.stop()); // Stop the stream
        setIsRecording(false);
      });
    } catch (error) {
      console.error("Error starting screen recording:", error);
    }
  };

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
    <>
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
      <div>
        <button onClick={startRecordingScreen} disabled={isRecording}>
          Start Screen Recording
        </button>
        <button
          onClick={() => socket.emit("stop_screen_recording")}
          disabled={!isRecording}
        >
          Stop Screen Recording
        </button>
      </div>
    </>
  );
}

export default App;
// comment
