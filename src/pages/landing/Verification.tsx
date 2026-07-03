import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Verification } from "@/components/landing/Verification";

export default function VerificationPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20"><Verification /></div>
      <Footer />
    </div>
  );
}