
import React, { useState } from 'react';
import { LogIn, Menu, X, Mic, CloudUpload, Keyboard, FileCheck } from 'lucide-react';

interface LandingPageProps {
  onEnterApp: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false); // Fecha o menu mobile se estiver aberto
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Dados dos passos com ícones
  const steps = [
    { icon: Mic, title: 'Exame', text: 'Você realiza o exame normalmente e registra os achados em áudio ou texto.' },
    { icon: CloudUpload, title: 'Envio', text: 'Os dados do exame são enviados para a central da Ecolink por canal seguro.' },
    { icon: Keyboard, title: 'Digitação', text: 'A equipe de laudistas digita e padroniza o laudo em modelos pré-definidos.' },
    { icon: FileCheck, title: 'Revisão', text: 'Você recebe o laudo pronto, revisa, faz os ajustes necessários e assina.' }
  ];

  return (
    <div className="font-sans text-[#222] leading-relaxed bg-[#f5f7fb] min-h-screen">
      {/* Header */}
      <header className="bg-[#0b3c75] text-white px-6 md:px-10 py-5 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-xl md:text-2xl font-bold tracking-tight">Ecolink Laudos Remotos</div>

          <div className="flex items-center gap-4 md:gap-6">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex gap-6 text-sm md:text-base">
              <button onClick={() => scrollToSection('como-funciona')} className="text-white hover:underline transition-all">Como funciona</button>
              <button onClick={() => scrollToSection('medicos')} className="text-white hover:underline transition-all">Para médicos</button>
              <button onClick={() => scrollToSection('laudistas')} className="text-white hover:underline transition-all">Para laudistas</button>
              <button onClick={() => scrollToSection('contato')} className="text-white hover:underline transition-all">Contato</button>
            </nav>

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden text-white p-1"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>

            {/* Botão de Acesso ao CloudVault */}
            <button
              onClick={onEnterApp}
              className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full transition-all border border-white/20 flex items-center justify-center group"
              title="Acessar Sistema CloudVault"
            >
              <LogIn size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#0b3c75] border-t border-white/10 shadow-xl py-4 flex flex-col items-center space-y-4 animate-in slide-in-from-top-5">
            <button onClick={() => scrollToSection('como-funciona')} className="text-white text-lg font-medium hover:text-[#ffd24c] transition-colors py-2">Como funciona</button>
            <button onClick={() => scrollToSection('medicos')} className="text-white text-lg font-medium hover:text-[#ffd24c] transition-colors py-2">Para médicos</button>
            <button onClick={() => scrollToSection('laudistas')} className="text-white text-lg font-medium hover:text-[#ffd24c] transition-colors py-2">Para laudistas</button>
            <button onClick={() => scrollToSection('contato')} className="text-white text-lg font-medium hover:text-[#ffd24c] transition-colors py-2">Contato</button>
          </div>
        )}
      </header>

      {/* Hero Section - Imagem com Texto Sobreposto */}
      <section className="relative w-full min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
        {/* Imagem de Fundo */}
        <img
          src="/hero-doctor.png"
          alt="Médica ultrassonografista relaxada"
          className="absolute inset-0 w-full h-full object-cover object-right"
        />

        {/* Overlay gradiente para melhorar legibilidade no mobile */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b3c75]/95 via-[#0b3c75]/80 to-transparent md:from-[#0b3c75]/90 md:via-[#0b3c75]/60 md:to-transparent"></div>

        {/* Conteúdo do Texto - Posicionado à esquerda */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-16 lg:py-20 w-full">
            <div className="max-w-lg lg:max-w-xl">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 md:mb-6 leading-tight">
                Laudos remotos para ultrassonografistas
              </h1>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/90 mb-6 md:mb-8 leading-relaxed">
                Atenda em várias cidades sem precisar levar uma digitadora. A Ecolink recebe suas informações, digita e devolve o laudo pronto para você revisar, assinar e entregar ao paciente.
              </p>
              <button
                onClick={() => scrollToSection('contato')}
                className="px-6 py-3 md:px-8 md:py-3.5 bg-[#ffd24c] text-[#0b3c75] rounded-lg font-bold text-base md:text-lg hover:bg-[#ffc107] transition-all shadow-lg cursor-pointer transform hover:scale-105"
              >
                Quero saber mais
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Como Funciona - Com Ícones */}
      <section id="como-funciona" className="py-16 px-5 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-[#0b3c75] mb-8 border-l-4 border-[#ffd24c] pl-4">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <div key={index} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border-t-4 border-[#0b3c75]/10 hover:border-[#0b3c75] group">
                {/* Ícone com número */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0b3c75] to-[#1376c5] flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                    <IconComponent size={26} className="text-white" strokeWidth={2} />
                  </div>
                  <span className="text-3xl font-bold text-[#0b3c75]/20 group-hover:text-[#0b3c75]/40 transition-colors">{index + 1}</span>
                </div>
                <h3 className="text-xl font-bold text-[#0b3c75] mb-2">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Seção Para Médicos */}
      <section id="medicos" className="py-16 px-5 max-w-6xl mx-auto bg-white rounded-3xl shadow-sm my-10">
        <h2 className="text-2xl md:text-3xl font-bold text-[#0b3c75] mb-8 border-l-4 border-[#ffd24c] pl-4">Para médicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-[#f5f7fb] p-6 rounded-xl">
            <h3 className="text-xl font-bold text-[#0b3c75] mb-4">Vantagens</h3>
            <ul className="space-y-2 text-gray-700 list-disc pl-5">
              <li>Mobilidade para atender em várias cidades.</li>
              <li>Laudos padronizados e bem apresentados.</li>
              <li>Redução de custos fixos com digitadora presencial.</li>
              <li>Cobrança por laudo, conforme o volume de exames.</li>
            </ul>
          </div>
          <div className="bg-[#f5f7fb] p-6 rounded-xl">
            <h3 className="text-xl font-bold text-[#0b3c75] mb-4">O que você precisa</h3>
            <ul className="space-y-2 text-gray-700 list-disc pl-5">
              <li>Computador com internet estável.</li>
              <li>Impressora conectada ao computador.</li>
              <li>Celular com WhatsApp ou aplicativo de comunicação.</li>
              <li>Compromisso de revisar cada laudo antes de assinar.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Seção Para Laudistas */}
      <section id="laudistas" className="py-16 px-5 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-[#0b3c75] mb-8 border-l-4 border-[#ffd24c] pl-4">Para laudistas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-[#0b3c75] mb-4">Oportunidade de trabalho remoto</h3>
            <ul className="space-y-2 text-gray-700 list-disc pl-5">
              <li>Trabalho em home office.</li>
              <li>Remuneração por laudo produzido.</li>
              <li>Treinamento e padronização de modelos.</li>
              <li>Flexibilidade de horários.</li>
            </ul>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-xl font-bold text-[#0b3c75] mb-4">Perfil desejado</h3>
            <ul className="space-y-2 text-gray-700 list-disc pl-5">
              <li>Boa digitação e domínio de português.</li>
              <li>Familiaridade com termos médicos.</li>
              <li>Responsabilidade e sigilo com dados dos pacientes.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Seção Contato */}
      <section id="contato" className="py-16 px-5 max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-[#0b3c75] mb-8 text-center">Contato</h2>
        <div className="bg-white p-8 rounded-xl shadow-lg border-t-4 border-[#0b3c75]">
          <p className="text-center text-gray-600 mb-8">
            Preencha o formulário abaixo ou entre em contato pelo WhatsApp para saber mais sobre a Ecolink.
          </p>
          <form className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-bold text-gray-700 mb-1">Nome</label>
              <input type="text" id="nome" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b3c75] outline-none" placeholder="Seu nome" />
            </div>

            <div>
              <label htmlFor="tipo" className="block text-sm font-bold text-gray-700 mb-1">Sou</label>
              <input type="text" id="tipo" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b3c75] outline-none" placeholder="Médico, clínica, laudista..." />
            </div>

            <div>
              <label htmlFor="contato-field" className="block text-sm font-bold text-gray-700 mb-1">Contato (WhatsApp ou e-mail)</label>
              <input type="text" id="contato-field" className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b3c75] outline-none" placeholder="(DDD) 9xxxx-xxxx ou email" />
            </div>

            <div>
              <label htmlFor="mensagem" className="block text-sm font-bold text-gray-700 mb-1">Mensagem</label>
              <textarea id="mensagem" rows={4} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0b3c75] outline-none" placeholder="Conte brevemente o que você precisa"></textarea>
            </div>

            <button type="submit" className="w-full py-3 bg-[#0b3c75] text-white font-bold rounded-lg hover:bg-[#094068] transition-colors shadow-md mt-4">
              Enviar interesse
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0b3c75] text-white text-center py-8 px-4 mt-10">
        <p className="opacity-80">© {new Date().getFullYear()} Ecolink Laudos Remotos – Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
