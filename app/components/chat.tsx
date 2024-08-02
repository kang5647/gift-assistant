"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

 

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};


const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};


const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
}: ChatProps) => {
    const [userInput, setUserInput] = useState<string>("");
    const [messages, setMessages] = useState<MessageProps[]>([]);
    const [inputDisabled, setInputDisabled] = useState<boolean>(false);
    const [threadId, setThreadId] = useState<string>("");

    const messagesEndRef = useRef<HTMLDivElement>(null);
    
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // create a new threadID when chat component created
    useEffect(() => {
        const createThread = async () => {
        const res = await fetch(`/api/assistants/threads`, {
            method: "POST",
        });
        const data = await res.json();
        setThreadId(data.threadId);
        };
        createThread();
    }, []);

    const sendMessage = async (text: string) => {
        const response = await fetch(
        `/api/assistants/threads/${threadId}/messages`,
        {
            method: "POST",
            body: JSON.stringify({
            content: text,
            }),
        }
        );
        if (response.body){
            const stream = AssistantStream.fromReadableStream(response.body);
            handleReadableStream(stream);
        }
        else{
            console.log("No response body");
        }
    };

    const submitActionResult = async (runId: string, toolCallOutputs: any[]) => {
        const response = await fetch(
        `/api/assistants/threads/${threadId}/actions`,
        {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            runId: runId,
            toolCallOutputs: toolCallOutputs,
            }),
        }
        );
        if (response.body){
            const stream = AssistantStream.fromReadableStream(response.body);
            handleReadableStream(stream);
        } else {
            console.log("No response body");
        }
       
    };

    const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        if (!userInput.trim()) return;
        sendMessage(userInput);
        setMessages((prevMessages) => [
            ...prevMessages,
            { role: "user", text: userInput },
        ]);
        setUserInput("");
        setInputDisabled(true);
        scrollToBottom();
    };

    /* Stream Event Handlers */

    // textCreated - create new assistant message
    const handleTextCreated = () => {
        appendMessage("assistant", "");
    };

    // textDelta - append text to last assistant message
    const handleTextDelta = (delta) => {
        if (delta.value != null) {
        appendToLastMessage(delta.value);
        };
        if (delta.annotations != null) {
        annotateLastMessage(delta.annotations);
        }
    };

    // handleRequiresAction - handle function call
    const handleRequiresAction = async (
        event: AssistantStreamEvent.ThreadRunRequiresAction
    ) => {
        const runId = event.data.id;
        const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
        // loop over tool calls and call function handler
        const toolCallOutputs = await Promise.all(
        toolCalls.map(async (toolCall) => {
            const result = await functionCallHandler(toolCall);
            return { output: result, tool_call_id: toolCall.id };
        })
        );
        setInputDisabled(true);
        submitActionResult(runId, toolCallOutputs);
    };

    // handleRunCompleted - re-enable the input form
    const handleRunCompleted = () => {
        setInputDisabled(false);
    };

    const handleReadableStream = (stream: AssistantStream) => {
        // messages
        stream.on("textCreated", handleTextCreated);
        stream.on("textDelta", handleTextDelta);

        // events without helpers yet (e.g. requires_action and run.done)
        stream.on("event", (event) => {
        if (event.event === "thread.run.requires_action")
            handleRequiresAction(event);
        if (event.event === "thread.run.completed") handleRunCompleted();
        });
    };

    /*
        =======================
        === Utility Helpers ===
        =======================
    */

    const appendToLastMessage = (text) => {
        setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const updatedLastMessage = {
            ...lastMessage,
            text: lastMessage.text + text,
        };
        return [...prevMessages.slice(0, -1), updatedLastMessage];
        });
    };

    const appendMessage = (role, text) => {
        setMessages((prevMessages) => [...prevMessages, { role, text }]);
    };

    const annotateLastMessage = (annotations) => {
        setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const updatedLastMessage = {
            ...lastMessage,
        };
        annotations.forEach((annotation) => {
            if (annotation.type === 'file_path') {
            updatedLastMessage.text = updatedLastMessage.text.replaceAll(
                annotation.text,
                `/api/files/${annotation.file_path.file_id}`
            );
            }
        })
        return [...prevMessages.slice(0, -1), updatedLastMessage];
        });
        
    }

    return (
        <div className={styles.chatContainer}>
        <div className={styles.messages}>
            {messages.map((msg, index) => (
            <Message key={index} role={msg.role} text={msg.text} />
            ))}
            <div ref={messagesEndRef} />
        </div>
        <form
            onSubmit={handleSubmit}
            className={`${styles.inputForm} ${styles.clearfix}`}
        >
            <input
            type="text"
            className={styles.input}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter your question"
            />
            <button
            type="submit"
            className={styles.button}
            disabled={inputDisabled}
            >
            Send
            </button>
        </form>
        </div>
    );
};

export default Chat;
