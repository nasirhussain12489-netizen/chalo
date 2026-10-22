export interface IlmProjectGuidelineSection {
  heading: string;
  items: string[];
  subItems?: Record<number, string[]>;
}

export interface IlmJuniorProject {
  number: number;
  title: string;
  timeGuideline: string;
  purpose?: string;
  objectives: string[];
  guidelinesIntro?: string;
  guidelineSections: IlmProjectGuidelineSection[];
  preparationTips?: string[];
  successIndicators?: string[];
  evaluationCriteria: string[];
  afterCompleting: string[];
  summaryQuote: string;
  closingNote?: string;
}

export const ILM_JUNIOR_PROJECTS: IlmJuniorProject[] = [
  {
    number: 1,
    title: 'The Introductory Speech',
    timeGuideline: '4–6 minutes',
    objectives: [
      'To begin speaking before an audience',
      'To discover the speaking skills you already possess and areas requiring further attention',
      'To introduce yourself to fellow members',
    ],
    guidelinesIntro:
      'You will deliver your first speech based on an easy subject—yourself. Use this opportunity to share information that you feel comfortable with and want the group to know about you. The aim is to help club members learn about you and for you to gain confidence in speaking in front of an audience.',
    guidelineSections: [
      {
        heading: '1. Opening',
        items: [
          'Greet the audience.',
          'Thank the person who introduced you, if applicable.',
          'Capture the audience’s attention with a compelling fact, anecdote, or statement about yourself.',
        ],
      },
      {
        heading: '2. Body',
        items: [
          'Share key information about yourself. This can include: Where you were born and grew up; Your education, career, or family background; Significant experiences or events that shaped you; Hobbies and interests.',
          'You may also mention why you joined this program or what you hope to achieve.',
        ],
      },
      {
        heading: '3. Conclusion',
        items: [
          'Summarise the main points you have shared.',
          'Close with a strong remark or reflection.',
          'Thank the audience for listening.',
        ],
      },
    ],
    preparationTips: [
      'Organise your speech with a clear beginning, body, and conclusion.',
      'Practice aloud several times to ensure smooth delivery and to keep within the time limits.',
      'Use notes if you wish, but try not to read the entire speech.',
      'Don’t be concerned with gestures or stage movement at this stage; focus on sharing your story conversationally.',
    ],
    successIndicators: [
      'Clear and logical organisation',
      'Engagement and connection with the audience',
      'Willingness to accept and apply constructive feedback',
      'Completion of speech within the allocated time',
    ],
    evaluationCriteria: [
      'Did the speaker speak clearly and confidently?',
      'Was the speech organised with a clear introduction, body, and conclusion?',
      'Did the speaker select content that helped the audience get to know them?',
      'Did the speaker show effort in preparation and delivery?',
      'Did the speaker stay within the time limit?',
    ],
    afterCompleting: [
      'Receive supportive feedback from an evaluator, focusing on both strengths and areas for growth.',
      'Use this experience as a benchmark of your speaking abilities to track your future progress.',
    ],
    summaryQuote:
      'The purpose of this project is to introduce you to the club and to learn the basic structure of a public speech. Write and deliver a speech about any topic to introduce yourself to the group. Your speech may be humorous, informational, or any other style that appeals to you.',
  },
  {
    number: 2,
    title: 'Organise Your Speech',
    timeGuideline: '5–7 minutes',
    purpose:
      'This project teaches participants how to create a clear, logical structure for their presentations. The focus is on making speeches easy for the audience to follow and understand by developing a strong outline with a well-crafted opening, a purposeful body, and an effective conclusion.',
    objectives: [
      'Organise your thoughts into a logical sequence that leads the audience to a clearly defined goal.',
      'Build a speech outline that includes an engaging opening, informative body, and memorable conclusion.',
      'Enhance clarity and audience engagement through structure.',
      'Practice controlling nervousness as you deliver a more structured presentation.',
    ],
    guidelineSections: [
      {
        heading: '1. Select a Topic',
        items: [
          'Choose a subject you find interesting or important.',
          'Ensure the topic is manageable within the time frame.',
        ],
      },
      {
        heading: '2. Develop an Outline',
        items: [
          "Opening: Capture the audience's attention and introduce your main point.",
          'Body: Present two to four main points in logical order, using supporting facts, examples, or stories.',
          'Conclusion: Summarise your main idea and provide a strong closing statement.',
        ],
      },
      {
        heading: '3. Preparation Tips',
        items: [
          'Write a draft and then refine it by focusing on logical flow.',
          'Practice your speech aloud, revising as necessary to ensure smooth transitions and coherence.',
          'Use notes if needed, but aim for conversational delivery.',
        ],
      },
    ],
    successIndicators: [
      'The audience can easily follow the progression of your ideas.',
      'Each section (opening, body, conclusion) is clearly defined.',
      'The main point or goal is obvious and well-supported.',
      'Nervousness is managed, and confidence begins to show.',
    ],
    evaluationCriteria: [
      'Did the speaker present a well-organised speech with a clear opening, body, and conclusion?',
      'Was the main point or idea easily understood?',
      'Were transitions between points smooth and logical?',
      'Did the speaker maintain audience interest throughout?',
      'Was the presentation within the time limit?',
    ],
    afterCompleting: [
      'Participants receive constructive feedback focused on speech organisation, clarity, and audience engagement, as well as tips for improvement in future projects.',
    ],
    summaryQuote:
      'A well-organised speech is essential for effectiveness. This project helps you practice building a presentation with a solid structure, making it impactful and easy to understand.',
  },
  {
    number: 3,
    title: 'Get to the Point',
    timeGuideline: '5–7 minutes',
    purpose:
      'This project focuses on ensuring that your speech has a clear message and that every part of your presentation supports that message. The goal is for both you and your audience to know exactly what your speech intends to accomplish.',
    objectives: [
      'Select a speech topic and determine its general purpose (to inform, persuade, entertain, or inspire) as well as a specific purpose (the exact outcome you want).',
      'Organize your speech in a way that best achieves these purposes.',
      'Ensure the introduction, body, and conclusion all reinforce the speech’s purpose.',
      'Express sincerity and conviction, and control nervousness.',
      'Strive not to rely on notes during delivery; speak naturally and confidently.',
    ],
    guidelineSections: [
      {
        heading: '1. Topic and Purpose Selection',
        items: [
          'Choose a subject that interests you and evokes some feeling or conviction.',
          'Define a general purpose (inform, persuade, entertain, inspire) and a specific purpose (e.g., “I want my audience to understand the basics of time management”).',
        ],
      },
      {
        heading: '2. Organising Your Speech',
        items: [
          'Opening: Clearly state your subject and what the audience can expect to learn or gain.',
          'Body: Support your purpose with main points, facts, examples, or stories—each reinforcing your message.',
          'Conclusion: Reiterate your main idea and call the audience to think, feel, or act in line with your speech’s purpose.',
        ],
      },
      {
        heading: '3. Preparation and Delivery',
        items: [
          'As you develop your speech, ensure every part—beginning, middle, and end—connects back to your central message.',
          'Project conviction and sincerity in your delivery.',
          'Practice without relying on notes to build confidence and maintain audience engagement.',
        ],
      },
    ],
    evaluationCriteria: [
      'Was the general purpose (inform, persuade, entertain, inspire) clear?',
      'Was the specific purpose obvious and achieved?',
      'Did the organisation of the speech support the specific purpose?',
      'Did the introduction, body, and conclusion all reinforce the purpose?',
      'Was the speaker confident and sincere, with minimal nervousness?',
      'Was the use of notes minimised?',
      'Did the speaker stay within the allotted time?',
    ],
    afterCompleting: [
      'You will receive detailed feedback on whether your message was clear and compelling, and how effectively each section of your speech supported your purpose. Comments will address your sincerity, the organisation of your speech, and your ability to achieve your stated objective.',
    ],
    summaryQuote:
      'This project helps you practice zeroing in on your message, clarifying your purpose, and aligning your entire speech to achieve it. By the end, your audience should be able to summarise your message in one sentence.',
  },
  {
    number: 4,
    title: 'How to Say It',
    timeGuideline: '5–7 minutes',
    purpose:
      'This project helps you refine your speaking by carefully selecting words and phrases that accurately and vividly express your ideas. The emphasis is on using language appropriate for your topic, audience, and occasion while making your message more engaging and memorable.',
    objectives: [
      'Select precise, descriptive language that conveys your ideas clearly and vividly.',
      'Avoid jargon, slang, unnecessary technical terms, or clichés.',
      'Use words and phrases that paint pictures, evoke emotion, and reinforce your message.',
      'Adapt your language to suit the audience and context, keeping it simple, direct, and natural.',
    ],
    guidelineSections: [
      {
        heading: '1. Topic and Preparation',
        items: [
          'Choose a topic you care about and want to communicate with colour and clarity.',
          'Review each part of your speech to ensure word choices are vivid and easy to understand.',
          'Replace vague or dull expressions with lively ones; use metaphors, similes, and examples to paint pictures with words.',
        ],
      },
      {
        heading: '2. Presentation Techniques',
        items: [
          'Use specific and concrete language instead of generalities.',
          'Adjust word choices to match your audience’s level of understanding and interest.',
          'Strive for conversational, natural language; avoid artificially complex words unless necessary for the subject.',
          'Take care to use inclusive, respectful, and positive language.',
        ],
      },
      {
        heading: '3. Delivery',
        items: [
          'Practice speaking with expression and enthusiasm, using your chosen words to create interest and impact.',
          'Pay attention to rhythm, variety, and the natural flow of your sentences.',
        ],
      },
    ],
    evaluationCriteria: [
      'Did the speaker use language that was clear, accurate, and vivid?',
      'Did the words chosen help the audience visualise or connect with the ideas?',
      'Was jargon or technical language avoided or clearly explained?',
      'Did the speech use figures of speech (such as metaphors) when appropriate?',
      'Was the language appropriate for the topic and audience?',
      'Was the presentation within the time limit?',
    ],
    afterCompleting: [
      'You will receive feedback on your use of language—its clarity, vividness, and suitability for your audience and topic. Suggestions will focus on enhancing imagery, eliminating confusion, and strengthening your overall message.',
    ],
    summaryQuote:
      'This project is designed to sharpen your skill in saying exactly what you mean and making your message stand out. By the end, your words should engage, inform, and inspire your listeners.',
  },
  {
    number: 5,
    title: 'Your Body Speaks',
    timeGuideline: '5–7 minutes',
    purpose:
      'This project is designed to help you gain awareness of how your body language—stance, gestures, facial expressions, and movement—contributes to your message. The focus is on using physical presence to reinforce your words and connect more strongly with your audience.',
    objectives: [
      'Use stance, movement, gestures, facial expressions, and eye contact purposefully to express your message and achieve your speech’s purpose.',
      'Make your physical delivery smooth, natural, and supportive of your words, avoiding distracting mannerisms.',
      'Improve audience engagement and communication impact through effective body language.',
    ],
    guidelineSections: [
      {
        heading: '1. Topic and Preparation',
        items: [
          'Choose any topic that allows you to use expressive body language as part of your speech.',
          'Rehearse your speech while focusing on movement—practice standing still, moving with intention, and using gestures to highlight points.',
        ],
      },
      {
        heading: '2. Presentation Techniques',
        items: [
          'Stance: Stand confidently and avoid unintentional shifting or pacing.',
          'Movement: Use purposeful steps to underline transitions or emphasize key moments—avoid wandering.',
          'Gestures: Use your hands and arms to illustrate points, but keep gestures meaningful and not distracting.',
          'Facial Expressions: Let your face reflect the emotions you want to convey—smile, frown, or show surprise as needed.',
          'Eye Contact: Make regular eye contact with different audience members to create a sense of inclusion and connection.',
        ],
      },
      {
        heading: '3. Delivery Tips',
        items: [
          'Record or watch yourself practice your speech, noting your body motions and making adjustments as necessary.',
          'Ask a friend or peer for feedback specifically about your physical presence.',
        ],
      },
    ],
    evaluationCriteria: [
      'Did the speaker’s body language support and enhance the message?',
      'Were gestures, expressions, and movement purposeful and natural?',
      'Was eye contact used effectively to engage the audience?',
      'Did the speaker avoid distracting or repetitive mannerisms?',
      'Was the speaker’s physical presence confident and appropriate for the occasion?',
      'Did the speaker stay within the allotted time?',
    ],
    afterCompleting: [
      'You will receive feedback specifically focused on the use of body language during your presentation, including advice on how to further strengthen your physical delivery. Evaluators will offer suggestions for avoiding habits that detract from your message and highlight areas where your body language was especially effective.',
    ],
    summaryQuote:
      'The purpose of this project is to help you discover how your body can convey your message. Use movement, gestures, posture, and facial expressions to reinforce the meaning and impact of your words. By mastering physical delivery, you’ll add a new dimension to your presentations and make a lasting impression on your audience.',
  },
  {
    number: 6,
    title: 'Vocal Variety',
    timeGuideline: '5–7 minutes',
    purpose:
      'This project aims to help you develop your voice as a powerful tool for engaging the audience and enhancing the impact of your speech. This involves learning to vary your pace, pitch, volume, and resonance to add expression, clarity, and emotion to your message.',
    objectives: [
      'Use voice modulation—including changes in tone, pitch, rate, and volume—to highlight key points, create interest, and convey your message more effectively.',
      'Match your vocal delivery to the content and emotional tone of your speech.',
      'Avoid a monotonous delivery and instead use pauses and vocal emphasis for greater engagement.',
    ],
    guidelineSections: [
      {
        heading: '1. Prepare Your Speech',
        items: [
          'Select a topic that allows for expressive delivery and emotional range.',
          'Mark your script where voice changes may add drama, humour, emphasis, or clarity (e.g., raising/lowering your voice, speeding up/slowing down, adding a pause).',
        ],
      },
      {
        heading: '2. Techniques to Practice',
        items: [
          'Pitch: Raise and lower your voice to suggest excitement, authority, or inquiry.',
          'Rate: Speed up to convey energy or slow down for emphasis and clarity.',
          'Volume: Vary your loudness to command attention or create intimacy.',
          'Pauses: Insert natural breaks to allow meaning to sink in or create anticipation.',
          'Quality: Adjust resonance and tone to suit the subject and your audience.',
        ],
      },
      {
        heading: '3. Rehearsal',
        items: [
          'Record yourself or practice in front of a mirror and note where your delivery could be more expressive.',
          'Ask friends or mentors for feedback specifically on your vocal delivery.',
        ],
      },
      {
        heading: '4. Delivery',
        items: [
          'Make deliberate use of vocal dynamics throughout your speech.',
          'Ensure that every vocal choice supports your core message and intent.',
        ],
      },
    ],
    evaluationCriteria: [
      'Did the speaker use a variety of pitch, rate, and volume to enhance the message?',
      'Was the use of pause and emphasis effective?',
      'Did the speaker avoid a monotone, and was vocal delivery lively and appropriate for the content?',
      'Did the audience remain engaged and able to follow the intended emotional cues?',
      'Was the speech delivered within the time limit?',
    ],
    afterCompleting: [
      'You will receive feedback focused on your ability to vary your voice for effect, use pauses and emphasis, and make your speech more compelling through vocal delivery. Suggestions will highlight both strengths and opportunities for greater expressiveness.',
    ],
    summaryQuote:
      'The purpose of this project is to help you understand how using your voice with variety and expression brings your words to life. Mastery of vocal variety can turn a competent speech into a powerful and memorable message for your audience.',
  },
  {
    number: 7,
    title: 'Research Your Topic',
    timeGuideline: '5–7 minutes',
    purpose:
      'This project focuses on strengthening your speeches with reliable information gathered from a variety of sources. The objective is to support your ideas with well-researched facts, statistics, quotes, examples, and stories, moving beyond just your personal opinions.',
    objectives: [
      'Research your chosen topic using multiple sources such as books, articles, interviews, and reputable websites.',
      'Support each main point in your speech with specific evidence—facts, examples, statistics, quotations, and anecdotes.',
      'Cite your sources succinctly and clearly within your speech, so the audience knows the information is credible.',
      'Organise your researched material effectively to build a compelling, logical case for your message.',
    ],
    guidelineSections: [
      {
        heading: '1. Topic Selection',
        items: [
          'Pick a subject that interests you and is suitable for research.',
          'Ensure it’s narrow enough to cover thoroughly within the time limit.',
        ],
      },
      {
        heading: '2. Conduct Research',
        items: [
          'Collect information from multiple credible sources.',
          'Look for supporting material: statistics, expert testimony, stories, historical facts, and relevant examples.',
          'Keep track of where each piece of information comes from for proper citation.',
        ],
      },
      {
        heading: '3. Speech Structure',
        items: [
          'Opening: Introduce your topic and highlight its importance using a striking fact, question, or story from your research.',
          'Body: Present two to four main points, each supported by specific research findings. Reference your sources.',
          'Conclusion: Summarise the researched evidence and reinforce your main message.',
        ],
      },
      {
        heading: '4. Presentation Tips',
        items: [
          'Integrate supporting evidence smoothly into your speech—don’t overload your talk with statistics.',
          'Explain technical terms or complex findings as needed for your audience.',
          'Practice pronouncing names or terminology from your sources.',
        ],
      },
    ],
    evaluationCriteria: [
      'Did the speaker use a variety of supporting material—facts, statistics, expert opinions, anecdotes—to make their points clear and convincing?',
      'Were sources cited clearly and appropriately?',
      'Was the content well-organised and comprehensible?',
      'Was the speaker able to answer possible questions relating to their research?',
      'Was the speech delivered within the allotted time?',
    ],
    afterCompleting: [
      'You will receive feedback on the depth and appropriateness of your research, the clarity of your citations, and how effectively you used evidence to strengthen your points. Suggestions will focus on finding a balance between research and originality, as well as the clarity of presenting facts.',
    ],
    summaryQuote:
      'The purpose of this project is to build your skill in supporting ideas with well-chosen facts, examples, and evidence from reputable sources. Audiences trust and remember a speaker who can back up ideas with credible research.',
    closingNote:
      'This project prepares you to move from speaking solely from experience toward delivering presentations grounded in thorough research, enhancing your authority and credibility.',
  },
  {
    number: 8,
    title: 'Inspire Your Audience',
    timeGuideline: '5–7 minutes',
    purpose:
      'The purpose of this project is to practice writing and delivering a speech that truly inspires listeners, encouraging them to act, feel, or see the world in a new way. The speaker aims to motivate audience members to improve themselves personally, emotionally, professionally, or spiritually by appealing to their emotions and noble motives.',
    objectives: [
      'Select a topic that has the potential to inspire and motivate your audience.',
      'Craft a 5–7 minute speech that draws on personal stories, vivid language, and emotional connection.',
      'Appeal to listeners’ aspirations, values, or goals using positive, uplifting messages.',
      'Demonstrate skills from previous projects: clear purpose, organisation, word choice, vocal variety, body language, evidence, and persuasive techniques.',
      'Avoid using notes during delivery to enhance sincerity and conviction.',
    ],
    guidelineSections: [
      {
        heading: '1. Topic Selection',
        items: [
          'Choose a topic that you are passionate about and that can uplift or challenge your listeners.',
          'It might be a real-life accomplishment, overcoming adversity, a call to action, or a vision for a brighter future.',
        ],
      },
      {
        heading: '2. Content Development',
        items: [
          'Use stories, anecdotes, metaphors, and quotes to create vivid mental images and a strong emotional impact.',
          'Challenge the audience to adopt higher aspirations or beliefs.',
          'Appeal to noble motives and focus on the positive potential in your audience.',
        ],
      },
      {
        heading: '3. Connecting with Your Audience',
        items: [
          'Tailor your message for your specific audience by considering their needs, values, and perspectives.',
          'Build rapport and trust by sharing relatable experiences and enthusiastic delivery.',
          'Use body language, eye contact, and vocal variety to keep the audience engaged.',
        ],
      },
      {
        heading: '4. Organization',
        items: [
          'Structure your speech with a powerful opening that sets an inspirational tone.',
          'Develop the body with logical flow and emotional appeal.',
          'End with a compelling conclusion that leaves the audience motivated to take action or reflect positively.',
        ],
      },
      {
        heading: '5. Delivery',
        items: [
          'Speak confidently, with energy and conviction.',
          'Minimise reliance on notes—aim for a sincere connection.',
          'Incorporate dynamic voice, gestures, and facial expressions to reinforce your words.',
        ],
      },
    ],
    evaluationCriteria: [
      'Did the speech inspire the audience to believe or act at a higher level?',
      'Was the content emotionally engaging and uplifting?',
      'Did the speaker use stories, vivid language, and examples effectively?',
      'Was rapport and engagement with the audience maintained throughout?',
      'Did the speaker demonstrate skills developed in earlier projects?',
      'Was the speech within the allotted time (5–7 minutes)?',
    ],
    afterCompleting: [
      'You will receive supportive and detailed feedback on your ability to motivate and uplift listeners, the effectiveness of your emotional appeal, and how smoothly you combined previous skills into a single, inspiring presentation. Evaluators may focus on your storytelling, audience connection, and the memorable takeaways you provided.',
    ],
    summaryQuote:
      'Inspiring your audience requires both heart and technique—through stories, emotional connection, and a vision that invites listeners to grow and excel, you can truly make a difference with your words.',
  },
  {
    number: 9,
    title: 'Persuade with Power',
    timeGuideline: '5–7 minutes',
    purpose:
      "This project centres on developing your ability to persuade an audience to adopt a new belief, attitude, or behaviour. The goal is to use logic and emotion to clearly advocate for a specific viewpoint or course of action, blending evidence with compelling appeals to audience's values.",
    objectives: [
      'Select a controversial or meaningful topic on which a clear stance can be taken.',
      'Develop a well-structured speech that logically supports your viewpoint with facts, statistics, reasoning, and examples.',
      'Use emotional appeal to connect with your audience’s values, desires, or fears.',
      'Address opposition, anticipate scepticism, and refute counter-arguments respectfully and effectively.',
      'Aim to motivate the audience to accept your perspective or take action.',
    ],
    guidelineSections: [
      {
        heading: '1. Topic and Position',
        items: [
          'Pick a proposition you are invested in and believe is significant to your audience.',
          'Take a stand—let your opinion be unmistakable from the start.',
        ],
      },
      {
        heading: '2. Building Your Case',
        items: [
          'Introduction: State your position clearly and preview your main points.',
          'Body: Present logical arguments, supporting each with specific evidence. Use stories, quotes, statistics, and examples to strengthen your case.',
          'Emotional Appeal: Tap into the audience’s emotions—hopes, needs, or fears—to add urgency or inspiration.',
          'Counter-Arguments: Acknowledge opposing views and give thoughtful, respectful rebuttals.',
        ],
      },
      {
        heading: '3. Conclusion',
        items: [
          'Summarise your strongest arguments.',
          'Deliver a clear call to action or a compelling closing idea that leaves a memorable impression.',
        ],
      },
    ],
    preparationTips: [
      'Use confident, assertive body language and vocal variety to convey conviction.',
      'Build rapport by relating to your listeners’ experiences or concerns.',
      'Avoid appearing confrontational—invite rather than demand agreement.',
    ],
    evaluationCriteria: [
      'Was the speaker’s position clear and logical?',
      'Did the speech include solid factual support and emotional appeal?',
      'Did the speaker effectively anticipate and respond to objections?',
      'Was the conclusion convincing and memorable?',
      'Did the speaker motivate the audience to a belief or action?',
      'Was the speech delivered within 5–7 minutes?',
    ],
    afterCompleting: [
      'You will receive feedback on your ability to blend logical argument with emotional appeal, how well you handled opposition, and the effectiveness of your call to action. Evaluator suggestions will help strengthen your future persuasive presentations.',
    ],
    summaryQuote:
      'This project is designed to challenge your skill in influencing thought and action, combining evidence-based reasoning and emotional connection to create a powerful, persuasive impact.',
  },
  {
    number: 10,
    title: 'Inspire Your Audience (Final Culmination Project)',
    timeGuideline: '8–10 minutes',
    purpose:
      'The final core project focuses on inspiring your audience to improve themselves personally, emotionally, professionally, or spiritually. The speaker is encouraged to appeal to the highest motives and ideals of the audience, using emotional resonance, stories, and energetic delivery to drive home a message that uplifts and motivates.',
    objectives: [
      'Deliver a speech that inspires listeners, appealing to their noble motives and challenging them to reach higher levels of achievement or belief.',
      'Use stories, anecdotes, and quotes to add drama and emotional appeal.',
      'Demonstrate mastery of all skills developed in previous projects: clear purpose, effective organisation, impactful word choice, confident body language, expressive vocal variety, solid research, appropriate use of visual aids (if desired), and persuasive strategies.',
      'Avoid the use of notes during the speech to enhance sincerity and the connection with your audience.',
    ],
    guidelineSections: [
      {
        heading: '1. Choose a Compelling Topic',
        items: [
          'Select a subject with the potential to uplift or transform. This could be a tale of overcoming adversity, a call to personal or societal improvement, a community cause, or any vision that energises and unites your listeners.',
        ],
      },
      {
        heading: '2. Build Emotional Connection',
        items: [
          "From the opening, use vivid stories and passionate language. Appeal to your audience's deepest values, dreams, and goals.",
          'Use metaphors, personal anecdotes, or historical examples to create a strong emotional response.',
        ],
      },
      {
        heading: '3. Organise for Impact',
        items: [
          'Develop a strong, positive theme.',
          'Structure your speech with a motivational opening, a logically developed body filled with emotional and dramatic content, and a rousing conclusion that calls for action or reflection.',
        ],
      },
      {
        heading: '4. Delivery Techniques',
        items: [
          'Use expressive gestures, purposeful movement, facial expressions, and vocal energy to connect deeply.',
          'Maintain eye contact with the audience throughout; avoid using notes to enhance credibility and engagement.',
        ],
      },
      {
        heading: '5. Appeal to Action or Reflection',
        items: [
          'Challenge your audience to rise to a higher standard, adopt a positive change, or unite behind a cause.',
          'Leave them with a memorable call to action or a powerful thought that lingers after the conclusion.',
        ],
      },
    ],
    evaluationCriteria: [
      'Did the speaker inspire the audience, appealing to noble motives and challenging them to improve?',
      'Was the content emotionally engaging, positive, and uplifting?',
      'Did the speaker use stories, vivid language, and examples effectively?',
      'Was mastery of previous speaking skills evident?',
      'Was the delivery dynamic, sincere, and free of notes?',
      'Was the speech effective within 8–10 minutes?',
    ],
    afterCompleting: [
      'You will receive feedback on your ability to inspire and energise an audience, your emotional connection, and the integration of all previously learned skills into one powerful, memorable presentation.',
    ],
    summaryQuote:
      'An inspirational speech builds unity, enthusiasm, and drive—a speaker who can truly inspire not only moves hearts, but changes lives.',
    closingNote:
      'This project marks the culmination of the foundational communication program, showcasing your development into a confident, purposeful, and motivating public speaker.',
  },
];
