"use client";

import { use,useEffect, useRef, useState } from "react";
import socket from "@/socket";
import { Video, VideoOff, Mic, MicOff, LogOut } from "lucide-react";

export default function JoinClass({ params }) {
  const { roomId } = use(params);  
  const participantName = "User"; 
  <time datetime="2016-10-25" suppressHydrationWarning />

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [remoteStreamAvailable, setRemoteStreamAvailable] = useState(false);

  useEffect(() => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    peerConnectionRef.current = pc;

    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;
        localVideoRef.current.srcObject = stream;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        socket.emit("join-room", { roomId, participant: participantName });

        socket.on("offer", async (offer) => {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("answer", answer);
        });

        socket.on("answer", async (answer) => {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        });

        socket.on("ice-candidate", async (candidate) => {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
          }
        };

        pc.ontrack = (event) => {
          remoteVideoRef.current.srcObject = event.streams[0];
          setRemoteStreamAvailable(true); 
          
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit("offer", offer);

        socket.on("update-participants", (list) => {
          setParticipants(list);
        });

        socket.on("user disconnected", (user) => {
          setParticipants((prev) => prev.filter((p) => p !== user));
        });
      } catch (err) {
        console.error("Media error:", err);
      }
    };

    setupMedia();

    return () => {
      socket.emit("leave-room", roomId);
      socket.disconnect();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [roomId]);

  const toggleVideo = () => {
    const videoTrack = localStreamRef.current
      ?.getTracks()
      .find((t) => t.kind === "video");
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
    }
  };

  const toggleAudio = () => {
    const audioTrack = localStreamRef.current
      ?.getTracks()
      .find((t) => t.kind === "audio");
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsAudioEnabled(audioTrack.enabled);
    }
  };

  const handleLeave = () => {
    socket.emit("leave-room", roomId);
    window.location.href = "/dashboard/LiveClass";
  };

  return (
    <div className="min-h-screen flex">
      {/* Participants Sidebar
      <div className="w-1/4 bg-gray-100 p-4 border-r border-gray-300">
        <h2 className="text-lg font-bold text-[#4F46E5] mb-4">Participants</h2>
        <ul className="space-y-2">
          {participants.map((participant, index) => (
            <li
              key={index}
              className={px-4 py-2 rounded ${
                participant === "Teacher"
                  ? "bg-[#4F46E5] text-white"
                  : "bg-gray-200 text-gray-700"
              }}
            >
              {participant}
            </li>
          ))}
        </ul>
      </div> */}

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 relative">
        <h2 className="text-2xl font-bold text-[#4F46E5] mb-4">
          Live Class Room: {roomId}
        </h2>

        <div className="w-3/4 h-96 bg-black flex items-center justify-center rounded-lg overflow-hidden relative">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          {!remoteStreamAvailable && (
            <p className="absolute text-white text-center">
              Waiting for other participant...
            </p>
          )}
        </div>

        <div className="w-1/4 h-1/4 bg-black rounded-lg overflow-hidden mt-4">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={toggleAudio}
            className="flex items-center gap-2 bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca]"
          >
            {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
            {isAudioEnabled ? "Mute" : "Unmute"}
          </button>

          <button
            onClick={toggleVideo}
            className="flex items-center gap-2 bg-[#4F46E5] text-white px-4 py-2 rounded hover:bg-[#4338ca]"
          >
            {isVideoEnabled ? <VideoOff size={18} /> : <Video size={18} />}
            {isVideoEnabled ? "Turn Off Video" : "Turn On Video"}
          </button>

          <button
            onClick={handleLeave}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            <LogOut size={18} />
            Leave Class
          </button>
        </div>
      </div>
    </div>
  );
}