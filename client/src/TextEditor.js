import { useCallback, useEffect, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
import "./TextEditor.css"; // Import CSS file for custom styles

const SAVE_INTERVAL_MS = 2000;
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

export default function TextEditor() {
  const { id: documentId } = useParams();
  const [socket, setSocket] = useState();
  const [quill, setQuill] = useState();

  // Establish the socket connection
  useEffect(() => {
    const s = io("https://beautiful-happiness-production.up.railway.app"); // Add 'https://' for a valid URL
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // Load the document from the server
  useEffect(() => {
    if (socket == null || quill == null) return;

    socket.once("load-document", (document) => {
      quill.setContents(document);
      quill.enable();
    });

    socket.emit("get-document", documentId);
  }, [socket, quill, documentId]);

  // Auto-save document changes
  useEffect(() => {
    if (socket == null || quill == null) return;

    const interval = setInterval(() => {
      socket.emit("save-document", quill.getContents());
    }, SAVE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, [socket, quill]);

  // Listen for incoming changes and update the editor
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta) => {
      quill.updateContents(delta);
    };
    socket.on("receive-changes", handler);

    return () => {
      socket.off("receive-changes", handler);
    };
  }, [socket, quill]);

  // Emit changes made by the user
  useEffect(() => {
    if (socket == null || quill == null) return;

    const handler = (delta, oldDelta, source) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
    };
    quill.on("text-change", handler);

    return () => {
      quill.off("text-change", handler);
    };
  }, [socket, quill]);

  // Initialize the Quill editor
  const wrapperRef = useCallback((wrapper) => {
    if (wrapper == null) return;

    wrapper.innerHTML = "";
    const editor = document.createElement("div");
    wrapper.append(editor);
    const q = new Quill(editor, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    });
    q.disable();
    q.setText("Loading...");
    setQuill(q);
  }, []);

  // Share via WhatsApp function
  const shareViaWhatsApp = () => {
    if (!quill) return;
    const editorContent = quill.getText(); // Get plain text from the editor
    const encodedContent = encodeURIComponent(editorContent);
    const whatsappURL = `https://wa.me/?text=${encodedContent}`;

    // Open the WhatsApp sharing link in a new tab
    window.open(whatsappURL, "_blank");
  };

  return (
    <div className="container">
      <div className="ql-toolbar ql-snow">
        {/* Add the Share via WhatsApp button */}
        <button
          onClick={shareViaWhatsApp}
          className="whatsapp-share-button"
        >
          Share via WhatsApp
        </button>
      </div>
      <div className="editor-wrapper" ref={wrapperRef}></div>
    </div>
  );
}
