import HowItWorks from "../components/HowItWorks";
import Stats from "../components/Stats";
import Features from "../components/Features";
import Navbar from "../components/layouts/Navbar";
import Hero from "../components/Hero";
import Footer from "../components/layouts/Footer";
import { useNavigate } from "react-router-dom";
export default function Home() { const navigate = useNavigate();

const goToLogin = () => {
  navigate("/login");
};
  return (
    <>
      <Navbar onLogin={goToLogin} />
<Hero onLogin={goToLogin} />
      <Features />
      <Stats />
      <HowItWorks />
      <Footer />
    </>
  );
}