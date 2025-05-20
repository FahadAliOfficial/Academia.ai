"use client";

import { use,useEffect, useRef, useState } from "react";
import socket from "@/socket";
import { Video, VideoOff, Mic, MicOff, LogOut } from "lucide-react";
import { supabase } from "@/app/lib/supabaseClient";
import useUserSession from "@/app/lib/useUserSession";

export default function JoinClass({ params }) {
  const { roomId } = use(params);  
  <time datetime="2016-10-25" suppressHydrationWarning />
  const { user } = useUserSession({ redirectIfNoSession: true });
  
  // Use the user's name from their profile or fallback to "User"
  const participantName = user?.user_metadata?.name || "User"; 

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [remoteStreamAvailable, setRemoteStreamAvailable] = useState(false);
  const [userRole, setRole] = useState("");
  const [connectionStatus, setConnectionStatus] = useState("connecting");
  const [reconnecting, setReconnecting] = useState(false);
  useEffect(() => {
    if (user && user.user_metadata?.role) {
      setRole(user.user_metadata.role.toLowerCase());
    }
  }, [user]);
  useEffect(() => {
    // Initialize the peer connection with better ICE servers for better connectivity
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10
    });
    peerConnectionRef.current = pc;

    // Setup media handling and connection
    const setupMedia = async () => {
      try {
        // Get user media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        // Store stream and display local video
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Add all tracks to the peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Join the room with the current user's name
        const userName = user?.user_metadata?.name || participantName;
        socket.emit("join-room", { 
          roomId, 
          participant: userName,
          role: userRole
        });

        // Handle socket events with proper error handling
        socket.on("new-user-connect", async () => {
          console.log("New user connected - creating new offer");
          try {
            // Create a new offer when a new user connects
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true
            });
            await pc.setLocalDescription(offer);
            socket.emit("offer", offer);
          } catch (err) {
            console.error("Error creating new offer:", err);
          }
        });

        socket.on("offer", async (offer) => {
          try {
            console.log("Received offer - creating answer");
            if (pc.signalingState !== "stable") {
              console.log("Signaling state not stable, resetting connection");
              await Promise.all([
                pc.setLocalDescription({type: "rollback"}),
                pc.setRemoteDescription(new RTCSessionDescription(offer))
              ]);
            } else {
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
            }
            
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("answer", answer);
          } catch (err) {
            console.error("Error handling offer:", err);
          }
        });

        socket.on("answer", async (answer) => {
          try {
            console.log("Received answer");
            if (pc.signalingState !== "have-local-offer") {
              console.warn("Unexpected signaling state for answer:", pc.signalingState);
              return;
            }
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
          } catch (err) {
            console.error("Error handling answer:", err);
          }
        });

        socket.on("ice-candidate", async (candidate) => {
          try {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
              console.log("Queuing ICE candidate until remote description is set");
              // Queue the candidate for later processing
              setTimeout(async () => {
                if (pc.remoteDescription) {
                  await pc.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(err => console.error("Delayed ICE candidate error:", err));
                }
              }, 1000);
            }
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        });

        // Handle ICE candidate generation
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit("ice-candidate", event.candidate);
          }
        };

        // Connection state monitoring
        pc.onconnectionstatechange = (event) => {
          console.log("Connection state changed:", pc.connectionState);
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            console.log("Connection lost or failed - attempting to reconnect");
            // We could implement reconnection logic here if needed
          }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
          console.log("Remote track received");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setRemoteStreamAvailable(true);
          }
        };

        // Create initial offer
        const initialOffer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true
        });
        await pc.setLocalDescription(initialOffer);
        socket.emit("offer", initialOffer);

        // Track participants
        socket.on("update-participants", (list) => {
          setParticipants(list);
          console.log("Updated participants:", list);
        });

        socket.on("user-disconnected", (user) => {
          console.log("User disconnected:", user);
          setParticipants((prev) => prev.filter((p) => p !== user));
        });
      } catch (err) {
        console.error("Media setup error:", err);
      }
    };

    setupMedia();

    return () => {
      // Cleanup function
      console.log("Cleaning up WebRTC connection");
      socket.emit("leave-room", roomId);
      if (peerConnectionRef.current) {
        peerConnectionRef.current.ontrack = null;
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.onconnectionstatechange = null;
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("update-participants");
      socket.off("user-disconnected");
      socket.off("new-user-connect");
      
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
  const handleLeave = async() => {
    try {
      const live = localStorage.getItem("liveClassData");
      if (live) {
        const parsedData = JSON.parse(live);
        
        // Update live class status if user is a teacher
        if(userRole === 'teacher'){
          const { data, error } = await supabase
            .from('live_classes')
            .update({ is_active: 'false' }) 
            .eq('id', parsedData.id);
            
          if(error) {
            console.error("Error while updating the Class live status:", error);
          } else {
            console.log("Live class marked as inactive");
          }
        }
      }
      
      // Clean up video tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Properly leave the room
      socket.emit("leave-room", { roomId, participant: user?.user_metadata?.name || participantName });
      
      // Navigate back to the LiveClass page
      window.location.href = "/dashboard/LiveClass";
    } catch (error) {
      console.error("Error during leave:", error);
      // Still try to navigate back even if there's an error
      window.location.href = "/dashboard/LiveClass";
    }
  };
  // Update connection status based on peer connection state
  useEffect(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onconnectionstatechange = () => {
        const state = peerConnectionRef.current.connectionState;
        setConnectionStatus(state);
        
        if (state === "failed" || state === "disconnected") {
          setReconnecting(true);
          // Attempt to reconnect automatically
          setTimeout(() => {
            if (peerConnectionRef.current) {
              // Create new offer to restart ICE
              peerConnectionRef.current.createOffer({ iceRestart: true })
                .then(offer => peerConnectionRef.current.setLocalDescription(offer))
                .then(() => {
                  socket.emit("offer", peerConnectionRef.current.localDescription);
                  console.log("Initiated reconnection with new offer");
                })
                .catch(err => console.error("Error creating restart offer:", err))
                .finally(() => setReconnecting(false));
            }
          }, 2000);
        }
      };
    }
  }, [peerConnectionRef.current]);
    return (
    <div className="min-h-screen flex flex-col bg-gray-50 overflow-auto">
      {/* Header with connection status */}
      <div className="bg-white shadow-sm py-3 px-6 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#4F46E5]">
          Live Class Room: {roomId}
        </h2>
        <div className="flex items-center space-x-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            connectionStatus === "connected" ? "bg-green-100 text-green-800" : 
            connectionStatus === "connecting" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }`}>
            {reconnecting ? "Reconnecting..." : connectionStatus}
          </div>
          
          {participants.length > 0 && (
            <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-6">
        {/* Video and Participants Section */}
        <div className="flex flex-col lg:flex-row flex-1">
          {/* Participants Sidebar */}
          <div className="w-full lg:w-1/4 bg-white shadow-sm rounded-lg p-4 mb-4 lg:mb-0 lg:mr-4">
            <h3 className="text-lg font-semibold text-[#4F46E5] mb-4 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              Participants
            </h3>
            
            {participants.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No participants yet</div>
            ) : (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {participants.map((participant, index) => (
                  <li
                    key={index}
                    className={`px-4 py-2 rounded flex items-center ${
                      participant.includes("Teacher") || participant.toLowerCase().includes("teacher")
                        ? "bg-[#4F46E5] text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    {participant}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Video Container */}
          <div className="flex-1 flex flex-col">
            {/* Remote Video */}
            <div className="flex-1 bg-black rounded-lg overflow-hidden relative shadow-lg">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              {!remoteStreamAvailable && (
                <div className="absolute inset-0 flex items-center justify-center flex-col text-white">
                  <div className="animate-pulse mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-xl font-medium">Waiting for other participants to join...</p>
                  <p className="mt-2 text-gray-300">Make sure others have the correct room link</p>
                </div>
              )}
            </div>

            {/* Local Video */}
            <div className="w-1/4 h-32 bg-black rounded-lg overflow-hidden mt-4 shadow self-end relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                You ({participantName})
              </div>
            </div>
          </div>
        </div>
        
        {/* Control Panel */}
        <div className="py-4 px-6 bg-white shadow-sm mt-4 rounded-lg flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                isAudioEnabled 
                  ? "bg-[#4F46E5] text-white hover:bg-[#4338ca]" 
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              {isAudioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
              {isAudioEnabled ? "Mute" : "Unmute"}
            </button>

            <button
              onClick={toggleVideo}
              className={`flex items-center gap-2 px-4 py-2 rounded transition-colors ${
                isVideoEnabled 
                  ? "bg-[#4F46E5] text-white hover:bg-[#4338ca]"
                  : "bg-red-100 text-red-700 hover:bg-red-200"
              }`}
            >
              {isVideoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
              {isVideoEnabled ? "Camera On" : "Camera Off"}
            </button>
          </div>

          <div className="flex items-center">
            {reconnecting && (
              <span className="text-orange-600 animate-pulse flex items-center mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Reconnecting...
              </span>
            )}
            
            <button
              onClick={handleLeave}
              className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
            >
              <LogOut size={18} />
              Leave Class
            </button>          </div>
        </div>
      </div>
    </div>
  );
}