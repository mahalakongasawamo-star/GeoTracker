export default function SolutionPitch() {
  return (
    <section className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-500 text-white px-8 py-12">
      <h2 className="text-3xl font-bold">Upserv is the only full-service AI-optimized agency.</h2>
      <p className="mt-4 text-white/90 max-w-2xl">
        Hosting, AEO-optimized FAQs, 500+ pages of authority content, and a
        human content team that hunts down red Xs every month. The DIY tools
        give you a template — Upserv gives you a team.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <a
          href="#book"
          className="bg-white text-brand-700 font-semibold px-5 py-3 rounded-xl hover:bg-slate-100 transition"
        >
          Book a free consultation
        </a>
        <a
          href="#pulse"
          className="bg-white/10 ring-1 ring-white/30 text-white font-semibold px-5 py-3 rounded-xl hover:bg-white/20 transition"
        >
          Send me a monthly Pulse Report
        </a>
      </div>
    </section>
  );
}
