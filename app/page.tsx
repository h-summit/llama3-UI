"use client"
import { IoMdSend } from "react-icons/io";
import { FaRegStopCircle } from "react-icons/fa";
import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react'
import Markdown from 'marked-react';
import { useContext, createContext } from 'react';

type isChattingContextType = {
  isChatting: boolean;
  setIsChatting: React.Dispatch<React.SetStateAction<boolean>>
}
const isChattingContext = createContext<isChattingContextType>({
  isChatting: false,
  setIsChatting: () => { }
});

function MarkdownRender({
  markdown,
  baseURL
}: {
  markdown: string,
  baseURL?: string
}) {
  return (
    <article className='prose 
        prose-h1:text-white
        prose-h2:text-white
        prose-h3:text-white
        prose-h4:text-white
        prose-p:text-white
        prose-a:text-white
        prose-ul:text-white
        prose-strong:text-white
        prose-code:text-white
        prose-li:text-white
        prose-span:text-white
      '>
      <Markdown value={markdown} baseURL={baseURL ? baseURL : ''} />
    </article >
  )
}

type Message = {
  role: "assistant" | "user" | "system";
  content: string | ReadableStreamDefaultReader;
}

class ChatManager {

  private messages: Message[] = [{
    role: "system",
    content: "You are a helpful AI agent."
  }]

  url: string = '';

  constructor(url: string) {
    this.url = url;

  };

  getMessages(): Message[] {
    return this.messages;
  };

  async chat(prompt: string): Promise<Response> {
    const body = {
      model: 'llama3',
      messages: [...this.messages, {
        role: "user",
        content: prompt
      }]
    }
    return fetch(this.url, {
      method: "POST",
      body: JSON.stringify(body)
    });
  }
};

function Li_Message({
  message
}: {
  message: Message
}) {
  const [text, setText] = useState<string>('');
  const { isChatting, setIsChatting } = useContext(isChattingContext);

  async function readStreamAndSet(
    reader: ReadableStreamDefaultReader
  ) {
    reader.read().then(({ done, value }) => {
      if (done) {
        setIsChatting(false);
        return; // Stop reading when done
      }
      const rawjson = new TextDecoder().decode(value);
      const json = JSON.parse(rawjson);
      if (json.done === false) {
        setText(original => original + json.message.content);
      }
      if (!isChatting) { // Stop reading if isChatting is false
        return;
      }
      readStreamAndSet(reader);
    }).catch(error => {
      console.error('Error reading stream:', error);
    });
  }

  useEffect(() => {
    if (typeof (message.content) === 'string') {
      setText(message.content);
    }
    if (message.content instanceof ReadableStreamDefaultReader) {
      const reader = message.content;
      readStreamAndSet(reader);
    }
  }, []);

  return (
    <li
      className={clsx(
        'flex w-full space-x-4',
        message.role === 'user' && 'flex-row-reverse space-x-reverse',
        message.role === 'assistant' && 'flex-row'
      )}
    >
      <div>
        {message.role === 'assistant' && 'Llama3'}
      </div>
      <div>
        <MarkdownRender markdown={text} baseURL='' />
      </div>
    </li>
  );
}

export default function page() {

  const chatManager = new ChatManager('http://localhost:11434/api/chat');
  const textAreaDomRef = useRef<HTMLTextAreaElement | null>(null);
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [chattingReader, setReader] = useState<ReadableStreamDefaultReader<Uint8Array>>();

  const addOneMessage = (message: Message) => {
    setMessages(original => [
      ...original,
      message
    ])
  }

  const sendMessage = async () => {
    console.log('!!!!asdasdasdas');
    const user_input = textAreaDomRef.current?.value
    if (!user_input) return;

    if (textAreaDomRef.current) {
      textAreaDomRef.current.value = '';
    }

    setIsChatting(true);
    addOneMessage({
      role: "user",
      content: user_input
    });

    chatManager.chat(user_input)
      .then(response => response.body?.getReader())
      .then(reader => {
        if (reader) {
          setReader(reader);
          addOneMessage({
            role: "assistant",
            content: reader
          });
        }
      })

  };

  return (
    <isChattingContext.Provider value={{
      isChatting: isChatting,
      setIsChatting: setIsChatting
    }}>
      <div className='h-[100vh] full w-full bg-slate-800 text-slate-100'>
        <div className='h-[85%] w-[50%] mx-auto border p-10 overflow-y-auto'>
          <ul className='space-y-4'>
            {
              messages.map((message: Message, index: number) => {
                return <Li_Message
                  message={message}
                  key={index}
                >
                </Li_Message>;
              })
            }
          </ul>
        </div>
        <div className='h-[15%] w-[100%] border flex p-3 px-48 space-x-3'>
          <span>
            input your prompt here:
          </span>
          <div className={clsx(
            'w-[90%]  bg-slate-700 text-slate-50',
            isChatting && 'opacity-50 cursor-default'
          )}>
            <textarea
              disabled={isChatting}
              ref={textAreaDomRef}
              className='w-full h-full  bg-slate-700 p-3 text-slate-50'
              onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  sendMessage();
                }
              }}
            >
            </textarea>
          </div>
          {
            isChatting ?
              <button
                onClick={() => {
                  chattingReader?.cancel();
                }}
              >
                <FaRegStopCircle className="w-6 h-6" />
              </button>
              :
              <button
                onClick={sendMessage}
              >
                <IoMdSend className="w-6 h-6" />
              </button>
          }
        </div>
      </div>
    </isChattingContext.Provider>

  )
}
