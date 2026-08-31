import { useState } from "react";
import { AnalysisContext } from "./analysis-context";

const DEFAULT_CODE = `# Write your code here

def hello():
    print("Hello CodeGuard AI")
`;

export function AnalysisProvider({ children }) {
  const [
    analysisResult,
    setAnalysisResult,
  ] = useState(null);

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState("");

  const [
    scanRefreshKey,
    setScanRefreshKey,
  ] = useState(0);

  const [
    editorCode,
    setEditorCode,
  ] = useState(DEFAULT_CODE);

  const [
    editorLanguage,
    setEditorLanguage,
  ] = useState("python");

  const [
    editorFileName,
    setEditorFileName,
  ] = useState("pasted-code.py");

  const refreshScans = () => {
    setScanRefreshKey(
      (current) => current + 1,
    );
  };

  return (
    <AnalysisContext.Provider
      value={{
        analysisResult,
        setAnalysisResult,

        selectedProjectId,
        setSelectedProjectId,

        scanRefreshKey,
        refreshScans,

        editorCode,
        setEditorCode,

        editorLanguage,
        setEditorLanguage,

        editorFileName,
        setEditorFileName,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}