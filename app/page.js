"use client";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I help users find movies they like. How can I help you today?`,
    },
  ]);
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    const response = await fetch("api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    return reader.read().then(function processText({ done, value }) {
      if (done) {
        return;
      }
      const text = decoder.decode(value || new Uint8Array());
      setMessages((messages) => {
        let lastMessage = messages[messages.length - 1];
        let otherMessages = messages.slice(0, messages.length - 1);
        return [
          ...otherMessages,
          { ...lastMessage, content: lastMessage.content + text },
        ];
      });
      return reader.read().then(processText);
    });
  };
  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#282c34"
    >
      <Typography
        variant="h3"
        color="#FF5722" // Vibrant color for the title
        fontWeight="bold"
        mb={3}
        textAlign="center"
        letterSpacing={2}
        textTransform="uppercase"
      >
        Movie Box
      </Typography>
      <Stack
        direction="column"
        width="500px"
        height="700px"
        borderRadius={12}
        p={3}
        spacing={3}
        bgcolor="#1C1C1C" // Darker black for contrast
        boxShadow="0px 6px 30px rgba(0, 0, 0, 0.7)" // More pronounced shadow for depth
      >
        <Stack
          direction="column"
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          pr={1}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === "assistant" ? "flex-start" : "flex-end"
              }
            >
              <Box
                bgcolor={
                  message.role === "assistant" ? "#FFC107" : "#d3d3d3" // Lighter, vibrant colors for chat bubbles
                }
                color="white"
                borderRadius={16}
                p={2}
                maxWidth="75%"
                boxShadow="0px 4px 12px rgba(0, 0, 0, 0.3)"
              >
                {message.content}
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            variant="outlined"
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            InputLabelProps={{
              style: { color: '#9e9e9e' },
            }}
            InputProps={{
              style: {
                color: 'white',
                backgroundColor: '#333333',
                borderRadius: 8,
              },
            }}
          />
          <Button 
            variant="contained" 
            onClick={sendMessage}
            sx={{
              bgcolor: "#FF4081", // Pinkish color for the send button
              color: "white",
              '&:hover': {
                bgcolor: "#F50057", // Darker shade on hover
              },
              borderRadius: 8,
              padding: '8px 24px', // Slightly larger button
            }}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );  
  
}
