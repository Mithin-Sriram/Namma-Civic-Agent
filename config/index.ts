const config = {
  appName: "Namma-Civic-Agent",
  appDescription: "Bringing clarity to public services for everyone.",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  founder: {
    name: "Ashutosh",
    social: {
      linkedin: "https://linkedin.com/in/ashutosh887",
      twitter: "https://twitter.com/ashutosh887_",
      github: "https://github.com/ashutosh887",
      website: "https://ashutosh887.in"
    }
  },
  landing: {
    hero: {
      title: "Namma-Civic-Agent",
      subheading:
        "Ask natural questions about public schemes, rights, or benefits and get clear, actionable answers in plain language.",
      searchPlaceholder: "Ask about any public service…",
      primaryCta: "Start understanding",
      secondaryCta: "View examples",
      exampleLabel: "Try questions like",
      examples: [
        "Am I eligible for this welfare scheme?",
        "What documents do I need for this pension application?",
        "How do I appeal a rejected benefit claim?"
      ]
    },
    footer: {
      links: [
        { label: "Disclaimer", href: "/disclaimer" },
        { label: "Privacy", href: "/privacy" },
        { label: "About Us", href: "/about" },
        { label: "Contact", href: "/contact" }
      ],
      disclaimer:
        "Namma-Civic-Agent does not provide legal advice. For binding interpretations, consult official authorities or legal professionals."
    }
  },
  pages: {
    disclaimer: {
      title: "Disclaimer",
      subtitle: "Important information about the use of Namma-Civic-Agent",
      description: "Legal disclaimer and terms of use for Namma-Civic-Agent",
      content: {
        sections: [
          {
            title: "General Information",
            text: "Namma-Civic-Agent provides general information about public services. Information is for guidance only and not legal or professional advice."
          },
          {
            title: "Accuracy",
            text: "We strive for accuracy but cannot guarantee completeness. Verify critical information with official sources."
          },
          {
            title: "No Liability",
            text: "Namma-Civic-Agent is not liable for decisions made based on our information. Users must verify details independently."
          }
        ]
      }
    },
    privacy: {
      title: "Privacy Policy",
      subtitle: "How we collect, use, and protect your information",
      description: "Privacy policy and data protection information for Namma-Civic-Agent",
      content: {
        sections: [
          {
            title: "Information We Collect",
            text: "We collect queries, feedback, and technical data (IP, browser) for analytics and service improvement."
          },
          {
            title: "How We Use It",
            text: "Information is used to provide and improve services. We don't sell your data to third parties."
          },
          {
            title: "Data Security",
            text: "We implement security measures to protect your information. No internet transmission is 100% secure."
          },
          {
            title: "Your Rights",
            text: "You can access, update, or delete your information. Contact us to exercise these rights."
          }
        ]
      }
    },
    about: {
      title: "About Us",
      description: "Learn more about Namma-Civic-Agent and our mission",
      content: {
        sections: [
          {
            title: "Our Mission",
            text: "Making public services accessible and understandable. Government information should be clear and easy to find."
          },
          {
            title: "What We Do",
            text: "Ask questions about public services and get clear answers. We help navigate eligibility, documents, and appeals."
          },
          {
            title: "Our Approach",
            text: "We use technology to simplify complex government documentation into plain language answers."
          },
          {
            title: "Transparency",
            text: "We're transparent about limitations. Namma-Civic-Agent provides guidance, not official consultations or legal advice."
          }
        ]
      }
    },
    contact: {
      title: "Contact Us",
      subtitle: "Have questions or feedback? Reach out to us on social media or visit our website.",
      description: "Get in touch with the Namma-Civic-Agent team. Reach out to us on LinkedIn, Twitter, GitHub, or visit our website.",
      content: {
        heading: "Connect with the Founder",
        descriptionTemplate: "Feel free to reach out to {founderName} on any of these platforms:",
        responseTime: "We typically respond within 1-2 business days."
      }
    }
  }
};

export default config;
  