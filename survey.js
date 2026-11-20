// ─────────────────────────────────────────────────────────────
// Items and on-screen text (source: (수정본) Written Interview-Study2 Materials.docx, 261119)
// Inline format: **bold**, __underline__. Sentences are shown on separate lines automatically.
// To change any wording, edit this file only. "code" is the item code saved in the database; participants never see it.
// ─────────────────────────────────────────────────────────────
window.SURVEY = {
  version: "survey-en-261119-p1",
  lang: "en",

  title: "User Experience with AI-Assisted Email Writing",

  // {reward} is replaced with REWARD in config.js
  intro: [
    "Hello,",
    "The Graduate School of Information at Yonsei University is conducting research on users' experiences with generative AI email writing assistance. The purpose of this study is to examine how users behave and how they evaluate an AI feature when using it to write an email.",
    "If you choose to participate, you will complete an email-writing task using an AI feature in a hypothetical scenario and then complete a survey about your experience. The email you write will not actually be sent.",
    "The study takes approximately **15 minutes to complete.** You will receive {reward} through Prolific for completing the study. Participation is voluntary, and you may stop at any time.",
    "If you have any questions about the study, please use the contact information below or send a message through Prolific.",
    "Thank you."
  ],
  contact: "Contact: Yoonseo Jang (Master's student, Graduate School of Information, Yonsei University, ysjang@yonsei.ac.kr)",

  // One question per screen; choosing exitOn ends the survey
  screening: [
    // SQ1 (18+) removed: all Prolific participants are verified 18+
    { code: "SQ2", text: "In the past 6 months, have you personally written and sent an email for work or school?", options: ["Yes", "No"], exitOn: "2" }
  ],

  consent: {
    heading: "Consent to Participate and to the Collection and Use of Data",
    body: [
      "In this study, we will collect your Prolific ID, the text of the email you write, usage records such as task completion time and edits, and your survey responses. We will not collect your name, phone number, or personal email address. Please do not include any personal information or confidential work-related information in the email you write.",
      "The data collected will be managed under a research identification code and used for a master's thesis and related academic research. No personally identifiable information will be disclosed when the results are reported."
    ],
    question: "Have you read and understood the information above, and do you voluntarily agree to participate in this study and to the collection and use of your data?",
    options: ["I agree.", "I do not agree."]
  },

  taskIntro: {
    heading: "Main Experiment",
    lead: [
      "You will now be presented with an email writing scenario.",
      "Please read the information below and imagine that you are actually in this situation.",
      "On the following screen, you will write an email using an AI writing assistance feature."
    ],
    scenarioHeading: "Common Instructions",
    scenario: [
      "You are a workshop coordinator at a professional training center, and you are preparing the \"Career Skills Workshop.\"",
      "The guest speaker, Jordan Bennett, agreed to send the presentation slides by Monday, September 14, but as of Tuesday, September 15, the slides have not arrived. To prepare for the workshop, **you need to receive the slides by Wednesday, September 16.**",
      "Jordan Bennett is an outside expert with whom you may work again in the future. Please write a polite follow-up email that clearly states when you need the slides, without blaming the speaker or putting undue pressure on them.",
      "First, please review the previous emails from the speaker and a colleague from your training center. You will then use the provided draft and the AI writing assistance feature on the writing screen."
    ],
    guideHeading: "Task Instructions",
    // A step written as [text, note] shows the note in small text under the step
    guideSteps: [
      "Read the task description and the two previous emails, and then click the 'Write Email' button.",
      ["Review the draft on the writing screen, and then click the AI writing assistance button.", "Please imagine that you wrote this draft yourself."],
      "Read the AI suggestion shown in the body of the email, and then click the 'Apply and Edit' button. **You __must__ apply the AI suggestion once.**",
      "After applying it, feel free to edit or delete any part of the text to complete the email. You may also keep the AI-suggested content as it is.",
      "If needed, you can use 'View AI Suggestion Again,' 'View Original Draft,' and 'View 2 Previous Emails Again.'",
      "When you have finished the email, click the 'Done' button."
    ],
    guideNotes: [
      "The email you write will not actually be sent.",
      "After completing the task, you will answer questions about the AI writing assistance feature you just used."
    ]
  },

  // Attention check 1: task comprehension
  aq1: {
    lead: "Please confirm your understanding of the task. If needed, you may reread the task instructions above.",
    code: "AQ1",
    text: "In this task, what do you need to ask Jordan Bennett to do in your email?",
    options: ["Send the presentation slides for the workshop", "Change the workshop schedule", "Confirm the number of attendees for the workshop", "Process the speaker fee payment"]
  },

  // 7-point items
  likert: {
    heading: "Evaluation of Your Experience with the Email Writing Assistance Feature",
    lead: [
      "**Please indicate how much you agree or disagree with each statement based on your experience with the AI feature during the email-writing task.**",
      "**There are no right or wrong answers.**"
    ],
    scale: ["Strongly disagree", "Disagree", "Somewhat disagree", "Neither agree nor disagree", "Somewhat agree", "Agree", "Strongly agree"],
    // One screen = one array. "block" is the saved code prefix and is not shown. "lead" is shown as a line above that block.
    pages: [
      [
        { block: "EFF", items: [
          "This AI feature reduced the time needed to write the email.",
          "This AI feature helped me write the email faster.",
          "This AI feature reduced the effort required to write the email.",
          "This AI feature reduced the amount of text I had to write myself.",
          "Overall, this AI feature helped me write the email more efficiently."
        ]},
        { block: "EXP", lead: "For the following statements, think about the final version of the email you completed, including any edits you made after applying the AI suggestion.", items: [
          "As a result of using the AI feature, the wording of the final email became more natural.",
          "As a result of using the AI feature, the tone of the final email became more appropriate for the situation.",
          "As a result of using the AI feature, the sentences in the final email became clearer.",
          "As a result of using the AI feature, the wording of the final email became more professional.",
          "Overall, the wording of the final email improved."
        ]}
      ],
      [
        { block: "CID", items: [
          "This AI feature helped to improve the flow of ideas in the final email.",
          "This AI feature helped organize the key points of the final email logically.",
          "This AI feature helped the final email better reflect what I intended to convey.",
          "This AI feature helped communicate the purpose of the email more effectively to the recipient.",
          "This AI feature helped ensure that the final email included all the necessary information."
        ]},
        { block: "BUR", items: [
          "Revising the wording suggested by the AI felt burdensome.",
          "Adjusting the AI-suggested content to fit the flow of the email was cumbersome.",
          "I found it burdensome to adjust the tone of the AI-suggested text.",
          "It was cumbersome to revise the AI-suggested content to match what I meant to convey.",
          "It was burdensome to have to fix unnecessary or inappropriate parts of the AI suggestion.",
          "Overall, I found it burdensome to revise the AI suggestion to get the email the way I wanted it."
        ]}
      ],
      [
        { block: "INF", lead: "Please answer the following questions based on your experience with the AI feature during the email-writing task. Here, “email information” refers to the information contained in the email text.", items: [
          "I am concerned that this AI feature will use email information without my permission.",
          "I am concerned that this AI feature will use email information without clearly explaining how that information will be used.",
          "I am concerned that this AI feature will use email information for purposes other than helping me write emails.",
          "I am concerned that this AI feature will use email information inappropriately.",
          "I am concerned that this AI feature will share email information with third parties without my consent."
        ]},
        { block: "DIS", items: [
          "I felt uncomfortable with the AI using email information.",
          "I felt that the AI used more information than necessary to write the email.",
          "I felt that the AI used more email information than I was comfortable with.",
          "I felt that the range of email information the AI used was too wide.",
          "I felt that the AI’s use of email information went beyond what I considered acceptable."
        ]}
      ],
      [
        { block: "AGY", items: [
          "While writing the email, I felt that I was following the AI's suggestions rather than my own judgment.",
          "I felt limited in my ability to decide what to include in the email.",
          "I felt that decisions about the content of the email were driven by the AI rather than by me.",
          "I felt limited in my ability to choose the wording of the email.",
          "Overall, I felt that the AI was in control of writing the email."
        ]},
        // Attention check 2 (between Q7 and Q8, as one row in the same grid)
        { block: "AQ2", single: true, items: [
          "This item is intended to check whether you are reading the survey carefully. For this item, please select 'Somewhat agree' (⑤)."
        ]},
        { block: "PV", items: [
          "This AI feature was valuable for writing the email.",
          "This AI feature was worth the effort I put into using it.",
          "This AI feature was worth the time I spent using it.",
          "Overall, this AI feature provided me with good value."
        ]}
      ],
      [
        { block: "BI", items: [
          "I intend to use this AI feature when writing emails in the future.",
          "I expect to use this AI feature when writing emails in the future.",
          "I plan to use this AI feature when writing emails in the future.",
          "I am likely to use this AI feature when writing emails in the future.",
          "If this AI feature were available to me, I would actively use it when writing emails."
        ]},
        { block: "REC", items: [
          "I would say positive things about this AI feature to other people.",
          "I would recommend this AI feature to someone who seeks my advice.",
          "I would encourage friends and colleagues to use this AI feature.",
          "I would actively promote this AI feature to other people."
        ]},
        { block: "SAT", items: [
          "I am very satisfied with this AI feature.",
          "I am very pleased with this AI feature.",
          "Overall, I am satisfied with this AI feature."
        ]}
      ]
    ]
  },

  mc: {
    heading: "",
    lead: "The following questions are about the email writing task you just completed. Please answer based on the AI feature you used in this study.",
    questions: [
      { code: "MC1", type: "single", text: "In this study, how did the AI feature you used mainly support your email writing?",
        options: ["It revised or improved the existing sentences in the provided draft.", "It kept the existing sentences in the provided draft and added new content after them.", "I am not sure."] },
      { code: "MC2", type: "single", text: "In this study, what information did the AI feature use to support your email writing?",
        options: ["It used only the current email draft.", "It used the current email draft and the two previous emails.", "I am not sure."] }
    ]
  },

  bq: {
    heading: "Email and Generative AI Usage",
    lead: "The following questions are about your usual experience with email and generative AI. Please read each question and select the response that best reflects your actual experience.",
    questions: [
      { code: "BQ1", type: "single", text: "In the past 3 months, how often have you personally written and sent emails?",
        options: ["Daily or almost daily (5–7 days per week)", "2–4 days per week", "About once a week", "Less than once a week", "Not at all in the past three months"] },
      { code: "BQ2", type: "multi", text: "In the past 3 months, for what purposes have you mainly used email?", hint: "Select all that apply",
        options: ["Work-related communication", "School- or research-related communication", "Personal matters", "Other (please specify)"], otherIndex: 4, otherCode: "BQ2_ETC" },
      { code: "BQ3", type: "single", text: "In the past 3 months, how often have you used generative AI services (e.g., ChatGPT, Gemini, Claude, Copilot)?",
        options: ["Daily or almost daily (5–7 days per week)", "2–4 days per week", "About once a week", "Less than once a week", "I have not used them"] },
      { code: "BQ4", type: "single", text: "In the past 3 months, how many times have you used generative AI to write or revise an email?",
        options: ["Never", "1-2 times", "3-5 times", "6-10 times", "11 or more times"] }
    ]
  },

  dq: {
    heading: "Demographic Information",
    lead: "",
    questions: [
      { code: "DQ1", type: "single", text: "What is your __gender__?", options: ["Male", "Female", "Prefer not to answer"] },
      { code: "DQ2", type: "number", text: "What is your current __age__?", unit: "years old", min: 18, max: 99 },
      { code: "DQ3", type: "single", text: "What is the __highest level of education__ you have completed?", options: ["High school or less", "Some college, but no degree", "Associate degree", "Bachelor's degree", "Graduate degree"] },
      { code: "DQ4", type: "single", text: "What is your current __employment status__?",
        options: ["Employed full-time", "Employed part-time", "Self-employed or freelance", "Not employed and looking for work", "Not employed and not looking for work", "Prefer not to answer"],
        note: "※ If more than one option applies, please select the one that reflects your main job. If you are a student who is currently working, please select the type of employment that applies to you." }
    ]
  },

  // Pilot only (shown when MODE is "pilot")
  pf: {
    heading: "Feedback on This Study",
    lead: "Finally, we would like to hear about your experience with this study.",
    questions: [
      { code: "PF1", type: "scale", text: "Overall, the email-writing task was easy to understand." },
      { code: "PF2", type: "scale", text: "Overall, the survey questions were easy to understand." },
      { code: "PF3", type: "text", optional: true, hint: "Optional",
        text: "If any part of the task, the screens, or the survey questions was confusing or awkward, please describe it." }
    ]
  },

  end: {
    heading: "You have completed the survey.",
    body: "Thank you for taking the time to participate in this study."
  },

  exit: {
    screened: { heading: "The survey has ended.", body: "Thank you for your interest. Based on your answer, you are not eligible for this study." },
    declined: { heading: "The survey has ended.", body: "You did not agree to participate, so the survey has ended. You may close this window." }
  },

  ui: {
    start: "Start", next: "Next", saving: "Saving…",
    selectOne: "Select one",
    missing: n => n === 1 ? "1 question has not been answered." : n + " questions have not been answered.",
    missingOne: "Please select an answer.",
    ageEmpty: "Please enter your age.",
    ageDigits: "Please enter numbers only.",
    ageRange: (min, max) => "Please enter a number between " + min + " and " + max + ".",
    otherLabel: "Please specify",
    saveFailed: "Your answers could not be saved. Please check your internet connection and click the button again.",
    startFailed: "The survey could not be started.",
    startFailedHint: "Please check your internet connection and refresh the page.",
    taskDone: "You have finished writing the email. Please click 'Next'.",
    taskSaving: "Saving your email…",
    taskSaveFailed: "Your email could not be saved. Please check your internet connection and click 'Save again'.",
    taskFrameTitle: "Email-writing task",
    retry: "Save again",
    guideAgain: "Show the task instructions again",
    otherTab: "This survey is open in another tab. Please close this tab and continue in the original one.",
    finishing: "Saving your answers. Please do not close this window.",
    toProlific: "Return to Prolific",
    closeOk: "Your answers have been saved. You may close this window.",
    progress: "Progress",
    scaleTitle: "Response scale",
    noscript: "This survey requires JavaScript. Please enable JavaScript in your browser.",
    // researcher-only (visible only with ?test=1 or in preview)
    bannerPreview: "Preview mode · Responses are not saved.",
    bannerTest: "Test mode · Saved with mode = test.",
    condition: c => " (Condition " + c + ")",
    download: "Download this record (JSON, for checking)"
  }
};
