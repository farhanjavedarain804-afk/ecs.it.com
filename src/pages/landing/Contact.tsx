import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Contact } from "@/components/landing/Contact";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-20"><Contact /></div>
      <Footer />
    </div>
  );
}