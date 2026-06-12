import { useState, useEffect } from 'react';
import { TutorialDialog } from '../../../components/ui/TutorialDialog';
import character2 from '../../../assets/character2.png';

export function TicTacToeTutorial() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('tictactoeTutorialSeen');
    if (!hasSeenTutorial) {
      handleOpen();
    }
  }, []);

  const steps = [
    {
      title: 'آموزش دوز - مرحله ۱',
      content: 'این مرحله اول آموزش بازی دوز است. هدف بازی پر کردن یک ردیف، ستون یا قطر با علامت خودتان است.'
    },
    {
      title: 'آموزش دوز - مرحله ۲',
      content: 'این مرحله دوم آموزش دوز است. هر بازیکن به نوبت یک خانه خالی را با علامت خود (X یا O) پر می‌کند.'
    },
    {
      title: 'آموزش دوز - مرحله ۳',
      content: 'این مرحله سوم آموزش دوز است. استراتژی اصلی جلوگیری از برد حریف و تلاش برای ایجاد موقعیت برد برای خودتان است.'
    }
  ];

  const handleOpen = () => {
    setCurrentStep(0);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('tictactoeTutorialSeen', 'true');
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-2xl bg-blue-500 px-3 py-3 text-xs font-black text-white shadow-lg shadow-ink/10"
      >
        آموزش دوز
      </button>

      <TutorialDialog
        open={isOpen}
        onClose={handleClose}
        title={currentStepData.title}
        step={currentStep}
        totalSteps={steps.length}
        onNextStep={handleNextStep}
        characterImage={currentStep === 1 ? character2 : undefined}
      >
        <div className="space-y-4 text-center">
          <p className="font-bold text-ink/70">{currentStepData.content}</p>
          
          <div className="flex items-center justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full ${index === currentStep ? 'bg-blue-500' : 'bg-gray-300'}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleNextStep}
            className="rounded-2xl bg-moss px-4 py-3 font-black text-white"
          >
            {currentStep < steps.length - 1 ? 'مرحله بعد' : 'پایان آموزش'}
          </button>
        </div>
      </TutorialDialog>
    </>
  );
}