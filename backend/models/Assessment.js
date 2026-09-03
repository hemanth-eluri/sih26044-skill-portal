const mongoose = require('mongoose');

const AssessmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    lowercase: true,
    trim: true,
    required: true
  },
  description: String,
  difficulty: {
    type: String,
    lowercase: true,
    trim: true,
    default: 'intermediate'
  },
  estimatedTime: Number, // in minutes
  questions: [
    {
      questionText: String,
      text: String,
      type: {
        type: String,
        default: 'multiple-choice'
      },
      options: [String],
      correctAnswer: String,
      explanation: String,
      skillTested: String
    }
  ],
  passingScore: {
    type: Number,
    default: 60
  },
  skillsAssessed: {
    type: [String],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

AssessmentSchema.pre('validate', function(next) {
  if (Array.isArray(this.questions)) {
    this.questions.forEach(q => {
      if (!q.questionText && q.text) q.questionText = q.text;
      if (!q.text && q.questionText) q.text = q.questionText;
    });
  }
  if (!this.skillsAssessed || this.skillsAssessed.length === 0) {
    const skills = new Set();
    if (Array.isArray(this.questions)) {
      this.questions.forEach(q => {
        if (q.skillTested) skills.add(q.skillTested);
      });
    }
    this.skillsAssessed = [...skills];
  }
  next();
});

const AssessmentResultSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment'
  },
  assessmentSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AssessmentSession',
    index: true
  },
  mode: {
    type: String,
    enum: ['legacy', 'profile-skills', 'target-role', 'custom'],
    default: 'legacy'
  },
  skillsAssessed: [String],
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  timeSpent: Number, // in minutes
  totalQuestions: Number,
  correctAnswers: Number,
  score: Number, // percentage
  passed: Boolean,
  answers: [
    {
      questionId: mongoose.Schema.Types.ObjectId,
      selectedAnswer: String,
      isCorrect: Boolean
    }
  ],
  skillScores: [
    {
      skill: String,
      score: Number,
      level: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'beginner'
      }
    }
  ],
  topicScores: [{
    topic: String,
    correctAnswers: Number,
    totalQuestions: Number,
    score: Number
  }]
});

const Assessment = mongoose.model('Assessment', AssessmentSchema);
const AssessmentResult = mongoose.model('AssessmentResult', AssessmentResultSchema);

Assessment.Assessment = Assessment;
Assessment.AssessmentResult = AssessmentResult;

module.exports = Assessment;
module.exports.Assessment = Assessment;
module.exports.AssessmentResult = AssessmentResult;

