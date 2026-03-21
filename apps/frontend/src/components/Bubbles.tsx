export function Bubbles() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute top-10 left-10 w-20 h-20 bg-primary/20 rounded-full animate-bubble" />
      <div className="absolute top-1/4 right-20 w-32 h-32 bg-secondary rounded-full animate-bubble" style={{ animationDelay: "0.5s" }} />
      <div className="absolute bottom-20 left-1/4 w-16 h-16 bg-primary/30 rounded-full animate-bubble" style={{ animationDelay: "1s" }} />
      <div className="absolute bottom-1/3 right-10 w-24 h-24 bg-accent/10 rounded-full animate-bubble" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-5 w-12 h-12 bg-primary/25 rounded-full animate-bubble" style={{ animationDelay: "0.8s" }} />
    </div>
  );
}
