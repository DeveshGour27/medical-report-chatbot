import axios from "axios";

export const chatWithRAG = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Call your Python FastAPI RAG model
    const response = await axios.post("http://localhost:8000/rag", {
      question: message,
    });

    res.status(200).json({
      reply: response.data.answer,
    });

  } catch (error) {
    console.error("RAG Error:", error.message);

    res.status(500).json({
      error: "RAG model is not responding. Please start your Python API.",
    });
  }
};
