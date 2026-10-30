gsap.registerPlugin(ScrollTrigger);

document.addEventListener("DOMContentLoaded", (event) => {
  // Hero animations
  const heroH1 = document.querySelector(".hero h1");
  const heroLead = document.querySelector(".hero .lead");
  const heroActions = document.querySelector(".hero-actions");

  if (heroH1) {
    gsap.from(heroH1, { y: 50, opacity: 0, duration: 1, ease: "power3.out" });
  }
  if (heroLead) {
    gsap.from(heroLead, { y: 30, opacity: 0, duration: 1, delay: 0.2, ease: "power3.out" });
  }
  if (heroActions && heroActions.children.length > 0) {
    gsap.from(heroActions.children, { y: 20, opacity: 0, duration: 0.8, stagger: 0.1, delay: 0.4, ease: "power3.out" });
  }

  // Cards stagger animation
  const cards = gsap.utils.toArray(".card");
  if (cards.length > 0) {
    gsap.from(cards, {
      scrollTrigger: {
        trigger: ".grid",
        start: "top 80%"
      },
      y: 50, 
      opacity: 0, 
      duration: 0.8, 
      stagger: 0.1, 
      ease: "power3.out"
    });
  }

  // Section titles
  const sectionHeads = gsap.utils.toArray(".section-head");
  sectionHeads.forEach(head => {
    gsap.from(head, {
      scrollTrigger: {
        trigger: head,
        start: "top 85%"
      },
      y: 30,
      opacity: 0,
      duration: 0.8,
      ease: "power3.out"
    });
  });

  // Buttons hover effect
  const buttons = document.querySelectorAll(".btn");
  buttons.forEach(btn => {
    btn.addEventListener("mouseenter", () => {
      gsap.to(btn, { scale: 1.05, duration: 0.3, ease: "power2.out" });
    });
    btn.addEventListener("mouseleave", () => {
      gsap.to(btn, { scale: 1, duration: 0.3, ease: "power2.out" });
    });
  });
});