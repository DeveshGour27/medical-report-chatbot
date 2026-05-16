import React from 'react';
import { motion } from 'framer-motion';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const SuggestedQuestions = ({ selectedReport, onQuestionSelect, isVisible = true }) => {
  if (!selectedReport || !isVisible) return null;

  const suggestedQuestions = [
    {
      id: 1,
      text: "What do my cholesterol levels indicate?",
      icon: "Heart",
      category: "Cardiovascular"
    },
    {
      id: 2,
      text: "Are my hemoglobin levels within normal range?",
      icon: "Droplets",
      category: "Blood Work"
    },
    {
      id: 3,
      text: "How do my current results compare to previous reports?",
      icon: "TrendingUp",
      category: "Trends"
    },
    {
      id: 4,
      text: "What lifestyle changes should I consider based on these results?",
      icon: "Activity",
      category: "Recommendations"
    },
    {
      id: 5,
      text: "Which values require immediate attention?",
      icon: "AlertTriangle",
      category: "Priority"
    },
    {
      id: 6,
      text: "Can you explain the medical terminology in my report?",
      icon: "BookOpen",
      category: "Education"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-card border border-border rounded-lg p-6 mb-6"
    >
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
          <Icon name="Lightbulb" size={16} color="white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Suggested Questions</h3>
          <p className="text-sm text-muted-foreground">Get insights about your medical report</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestedQuestions?.map((question) => (
          <motion.div key={question?.id} variants={itemVariants}>
            <Button
              variant="outline"
              onClick={() => onQuestionSelect(question?.text)}
              className="w-full justify-start text-left h-auto p-4 hover:bg-muted transition-colors duration-200"
            >
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon name={question?.icon} size={16} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-1">{question?.text}</p>
                  <span className="text-xs text-muted-foreground">{question?.category}</span>
                </div>
              </div>
            </Button>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-muted rounded-lg">
        <div className="flex items-start space-x-2">
          <Icon name="Info" size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Medical Disclaimer</p>
            <p>This AI assistant provides general information only and should not replace professional medical advice. Always consult with your healthcare provider for medical decisions.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SuggestedQuestions;