// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";
import "@/styles/globals.css";
import { Toaster } from "@/components/ui/sonner";
import OnboardingPage from "@/pages/onboarding";

function App() {
  // const [greetMsg, setGreetMsg] = useState("");
  // const [name, setName] = useState("");

  // async function greet() {
  //   // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  //   setGreetMsg(await invoke("greet", { name }));
  // }

  return (
    <main>
      <OnboardingPage />
      <Toaster />
    </main>
  );
}

export default App;
