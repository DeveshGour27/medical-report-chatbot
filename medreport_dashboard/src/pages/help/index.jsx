import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Sidebar from '../../components/ui/Sidebar';
import Icon from '../../components/AppIcon';

const faqs = [
  {
    q: 'How do I upload a medical report?',
    a: 'Click "Upload Report" in the sidebar or dashboard. Drag and drop a PDF or image file. Our AI will automatically extract the medical values from it.'
  },
  {
    q: 'What file formats are supported?',
    a: 'We support PDF files and common image formats (JPG, PNG, WEBP). For best results, use clear, high-resolution scans.'
  },
  {
    q: 'How does the Chat Assistant work?',
    a: 'Go to Chat Assistant, select one of your uploaded reports, then ask any question. The AI will answer based on the actual values in your report.'
  },
  {
    q: 'Is my medical data secure?',
    a: 'Yes. All data is stored in a secure MongoDB database and associated only with your account. No one else can access your reports.'
  },
  {
    q: 'How do I update my profile information?',
    a: 'Go to Profile Settings from the sidebar or the user menu in the top right. Fill in your details and click "Save Changes".'
  },
  {
    q: 'Can I delete my reports?',
    a: 'Yes. In My Reports, click the delete icon on any report. You can also delete all reports at once from the settings.'
  }
];

const HelpSupport = () => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-background">
      <Header
        onSidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        isSidebarCollapsed={sidebarCollapsed}
      />
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <main className={`pt-16 transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60'}`}>
        <div className="p-6 max-w-3xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Icon name="HelpCircle" size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
              <p className="text-muted-foreground">Frequently asked questions and guidance</p>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="font-medium text-foreground">{faq.q}</span>
                  <Icon
                    name={openFaq === i ? 'ChevronUp' : 'ChevronDown'}
                    size={18}
                    className="text-muted-foreground flex-shrink-0"
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-muted-foreground text-sm leading-relaxed border-t border-border pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Contact Card */}
          <div className="mt-10 bg-primary/5 border border-primary/20 rounded-lg p-6 text-center">
            <Icon name="Mail" size={32} className="text-primary mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">Still need help?</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Reach out to our support team and we'll get back to you within 24 hours.
            </p>
            <a
              href="mailto:support@medreport.app"
              className="inline-flex items-center space-x-2 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Icon name="Send" size={16} />
              <span>Contact Support</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HelpSupport;
