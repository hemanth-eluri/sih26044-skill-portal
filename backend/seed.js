/**
 * Database seed data for ISOTOPES
 * Run this file to populate initial data
 */

const mongoose = require('mongoose');
const { Assessment } = require('./models/Assessment');
const AssessmentQuestion = require('./models/AssessmentQuestion');
const CareerRole = require('./models/CareerRole');
require('dotenv').config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/isotopes');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Assessment.deleteMany({});
    await AssessmentQuestion.deleteMany({});
    await CareerRole.deleteMany({});

    // ============ ASSESSMENTS ============
    const assessments = [
      {
        title: 'Python Programming Basics',
        category: 'programming',
        description: 'Test your Python programming knowledge',
        difficulty: 'beginner',
        estimatedTime: 15,
        skillsAssessed: ['Python', 'Programming Fundamentals'],
        passingScore: 60,
        questions: [
          {
            questionText: 'What is the output of print(2 ** 3)?',
            type: 'multiple-choice',
            options: ['6', '8', '5', '9'],
            correctAnswer: '8',
            explanation: '2 ** 3 means 2 to the power of 3, which equals 8',
            skillTested: 'Python'
          },
          {
            questionText: 'Which of the following is a mutable data type in Python?',
            type: 'multiple-choice',
            options: ['tuple', 'string', 'list', 'frozenset'],
            correctAnswer: 'list',
            explanation: 'Lists are mutable and can be modified after creation',
            skillTested: 'Python'
          },
          {
            questionText: 'What does len([1,2,3]) return?',
            type: 'multiple-choice',
            options: ['2', '3', '4', 'Error'],
            correctAnswer: '3',
            explanation: 'len() returns the number of elements in the list',
            skillTested: 'Python'
          },
          {
            questionText: 'Python is case-sensitive.',
            type: 'true-false',
            options: ['True', 'False'],
            correctAnswer: 'True',
            explanation: 'Python treats Var and var as different variables',
            skillTested: 'Programming Fundamentals'
          },
          {
            questionText: 'Which keyword is used to create a function in Python?',
            type: 'multiple-choice',
            options: ['function', 'def', 'define', 'func'],
            correctAnswer: 'def',
            explanation: 'The def keyword is used to define functions in Python',
            skillTested: 'Python'
          },
          {
            questionText: 'What is the default return value of a function?',
            type: 'multiple-choice',
            options: ['0', '1', 'None', 'False'],
            correctAnswer: 'None',
            explanation: 'Functions return None by default if no return statement is provided',
            skillTested: 'Python'
          },
          {
            questionText: 'Which data structure uses LIFO principle?',
            type: 'multiple-choice',
            options: ['Queue', 'Stack', 'Array', 'Tree'],
            correctAnswer: 'Stack',
            explanation: 'Stack uses Last In First Out (LIFO) principle',
            skillTested: 'Programming Fundamentals'
          },
          {
            questionText: 'What is the correct way to import a module in Python?',
            type: 'multiple-choice',
            options: ['include math', 'import math', 'from math import *', 'Both B and C'],
            correctAnswer: 'Both B and C',
            explanation: 'Both are valid ways to import modules in Python',
            skillTested: 'Python'
          }
        ]
      },
      {
        title: 'JavaScript Fundamentals',
        category: 'programming',
        description: 'Test your JavaScript knowledge',
        difficulty: 'beginner',
        estimatedTime: 15,
        skillsAssessed: ['JavaScript', 'Web Development'],
        passingScore: 60,
        questions: [
          {
            questionText: 'What does DOM stand for?',
            type: 'multiple-choice',
            options: ['Document Object Model', 'Data Object Model', 'Domain Object Model', 'Detailed Object Model'],
            correctAnswer: 'Document Object Model',
            explanation: 'DOM is the Document Object Model that represents HTML documents',
            skillTested: 'JavaScript'
          },
          {
            questionText: 'Which method is used to select an element by ID?',
            type: 'multiple-choice',
            options: ['getElementsById()', 'getElementByID()', 'getElementById()', 'selectById()'],
            correctAnswer: 'getElementById()',
            explanation: 'getElementById() is the correct method to select by ID',
            skillTested: 'JavaScript'
          },
          {
            questionText: 'JavaScript is a compiled language.',
            type: 'true-false',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'JavaScript is an interpreted language',
            skillTested: 'JavaScript'
          },
          {
            questionText: 'What is the correct way to declare a variable in JavaScript?',
            type: 'multiple-choice',
            options: ['v name = "John"', 'var name = "John"', 'variable name = "John"', 'name = "John"'],
            correctAnswer: 'var name = "John"',
            explanation: 'var is one way to declare variables (also let and const)',
            skillTested: 'JavaScript'
          },
          {
            questionText: 'Which event occurs when a user clicks on an element?',
            type: 'multiple-choice',
            options: ['onchange', 'onclick', 'onmouseover', 'onload'],
            correctAnswer: 'onclick',
            explanation: 'The onclick event is triggered when an element is clicked',
            skillTested: 'Web Development'
          },
          {
            questionText: 'What is the purpose of JSON.parse()?',
            type: 'multiple-choice',
            options: ['Convert object to string', 'Convert string to object', 'Check syntax', 'Format code'],
            correctAnswer: 'Convert string to object',
            explanation: 'JSON.parse() converts a JSON string into a JavaScript object',
            skillTested: 'JavaScript'
          }
        ]
      },
      {
        title: 'Data Science Fundamentals',
        category: 'data-science',
        description: 'Test your data science and statistics knowledge',
        difficulty: 'intermediate',
        estimatedTime: 20,
        skillsAssessed: ['Machine Learning', 'Statistics', 'Python'],
        passingScore: 60,
        questions: [
          {
            questionText: 'What does overfitting mean in machine learning?',
            type: 'multiple-choice',
            options: ['Model learns too well', 'Model fits training data too closely', 'Model ignores features', 'Model is too simple'],
            correctAnswer: 'Model fits training data too closely',
            explanation: 'Overfitting occurs when a model learns the training data too well, including its noise',
            skillTested: 'Machine Learning'
          },
          {
            questionText: 'Which of these is a supervised learning algorithm?',
            type: 'multiple-choice',
            options: ['K-means', 'Linear Regression', 'DBSCAN', 'Hierarchical Clustering'],
            correctAnswer: 'Linear Regression',
            explanation: 'Linear Regression is a supervised learning algorithm',
            skillTested: 'Machine Learning'
          },
          {
            questionText: 'What is the mean of [2, 4, 6, 8, 10]?',
            type: 'multiple-choice',
            options: ['4', '5', '6', '7'],
            correctAnswer: '6',
            explanation: 'Mean = (2+4+6+8+10)/5 = 30/5 = 6',
            skillTested: 'Statistics'
          },
          {
            questionText: 'Correlation implies causation.',
            type: 'true-false',
            options: ['True', 'False'],
            correctAnswer: 'False',
            explanation: 'Correlation does not imply causation',
            skillTested: 'Statistics'
          },
          {
            questionText: 'Which library is commonly used for data manipulation in Python?',
            type: 'multiple-choice',
            options: ['NumPy', 'Pandas', 'Matplotlib', 'TensorFlow'],
            correctAnswer: 'Pandas',
            explanation: 'Pandas is the primary library for data manipulation and analysis',
            skillTested: 'Python'
          },
          {
            questionText: 'What is the range of values in a correlation coefficient?',
            type: 'multiple-choice',
            options: ['0 to 1', '-1 to 1', '-∞ to ∞', '0 to 100'],
            correctAnswer: '-1 to 1',
            explanation: 'Correlation coefficient ranges from -1 (perfect negative) to 1 (perfect positive)',
            skillTested: 'Statistics'
          }
        ]
      }
    ];

    await Assessment.insertMany(assessments);
    const questionBank = assessments.flatMap(assessment => assessment.questions.map(question => ({
      skill: question.skillTested,
      topic: assessment.title,
      difficulty: assessment.difficulty === 'advanced' ? 'hard' : assessment.difficulty === 'beginner' ? 'easy' : 'medium',
      questionText: question.questionText,
      questionType: 'mcq',
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      sourceType: 'curated',
      sourceReference: 'ISOTOPES seed question bank',
      verificationStatus: 'verified',
      active: true
    })).filter(question => question.skill && question.options.length >= 2));
    await AssessmentQuestion.insertMany(questionBank);
    console.log('✅ Assessments seeded');

    // ============ CAREER ROLES ============
    const careerRoles = [
      {
        title: 'Software Engineer',
        description: 'Design, build, and maintain software applications',
        industry: 'Technology',
        experience_level: 'entry',
        requiredSkills: [
          { name: 'Python', level: 'intermediate', importance: 'critical', alternatives: ['Java', 'C++'] },
          { name: 'JavaScript', level: 'intermediate', importance: 'high', alternatives: [] },
          { name: 'Git', level: 'intermediate', importance: 'high', alternatives: [] },
          { name: 'Data Structures', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'Problem Solving', level: 'intermediate', importance: 'critical', alternatives: [] }
        ],
        niceToHaveSkills: [
          { name: 'Docker', level: 'beginner' },
          { name: 'CI/CD', level: 'beginner' },
          { name: 'Cloud Services', level: 'beginner' }
        ],
        averageSalary: 600000,
        jobMarketDemand: 'very_high',
        futureRelevance: 'stable',
        typicalCompanies: ['Google', 'Microsoft', 'Apple', 'Amazon', 'Meta'],
        careerPathDetails: {
          description: 'Start as a junior engineer, progress to senior engineer, then tech lead or architect roles',
          nextRoles: ['Senior Software Engineer', 'Tech Lead', 'Software Architect'],
          growthOpportunities: ['Full Stack Development', 'DevOps', 'Technical Management']
        }
      },
      {
        title: 'Data Scientist',
        description: 'Analyze data and build machine learning models to solve business problems',
        industry: 'Technology',
        experience_level: 'entry',
        requiredSkills: [
          { name: 'Python', level: 'advanced', importance: 'critical', alternatives: ['R'] },
          { name: 'Machine Learning', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'Statistics', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'Data Analysis', level: 'intermediate', importance: 'high', alternatives: [] },
          { name: 'SQL', level: 'intermediate', importance: 'high', alternatives: [] }
        ],
        niceToHaveSkills: [
          { name: 'Deep Learning', level: 'beginner' },
          { name: 'Big Data Tools', level: 'beginner' },
          { name: 'Data Visualization', level: 'intermediate' }
        ],
        averageSalary: 700000,
        jobMarketDemand: 'high',
        futureRelevance: 'emerging',
        typicalCompanies: ['Google', 'Meta', 'Netflix', 'Amazon', 'Microsoft'],
        careerPathDetails: {
          description: 'Progress from junior to senior data scientist, then into ML engineering or data leadership',
          nextRoles: ['Senior Data Scientist', 'ML Engineer', 'Analytics Manager'],
          growthOpportunities: ['Deep Learning', 'MLOps', 'Research']
        }
      },
      {
        title: 'Web Developer',
        description: 'Build and maintain web applications and websites',
        industry: 'Technology',
        experience_level: 'entry',
        requiredSkills: [
          { name: 'HTML', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'CSS', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'JavaScript', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'React', level: 'intermediate', importance: 'high', alternatives: ['Vue', 'Angular'] },
          { name: 'Node.js', level: 'intermediate', importance: 'high', alternatives: ['Python', 'PHP'] }
        ],
        niceToHaveSkills: [
          { name: 'TypeScript', level: 'beginner' },
          { name: 'REST APIs', level: 'intermediate' },
          { name: 'Database Design', level: 'beginner' }
        ],
        averageSalary: 550000,
        jobMarketDemand: 'very_high',
        futureRelevance: 'stable',
        typicalCompanies: ['Google', 'Amazon', 'Facebook', 'Startup Companies'],
        careerPathDetails: {
          description: 'Start as junior web developer, progress to full stack, then architect or team lead',
          nextRoles: ['Senior Web Developer', 'Full Stack Engineer', 'Technical Lead'],
          growthOpportunities: ['Mobile Development', 'DevOps', 'System Design']
        }
      },
      {
        title: 'Cloud Architect',
        description: 'Design and manage cloud infrastructure solutions',
        industry: 'Technology',
        experience_level: 'senior',
        requiredSkills: [
          { name: 'AWS', level: 'advanced', importance: 'critical', alternatives: ['Azure', 'GCP'] },
          { name: 'Cloud Architecture', level: 'advanced', importance: 'critical', alternatives: [] },
          { name: 'Networking', level: 'intermediate', importance: 'high', alternatives: [] },
          { name: 'Security', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'DevOps', level: 'intermediate', importance: 'high', alternatives: [] }
        ],
        niceToHaveSkills: [
          { name: 'Kubernetes', level: 'intermediate' },
          { name: 'Infrastructure as Code', level: 'intermediate' },
          { name: 'Compliance', level: 'beginner' }
        ],
        averageSalary: 1200000,
        jobMarketDemand: 'high',
        futureRelevance: 'emerging',
        typicalCompanies: ['Amazon', 'Microsoft', 'Google', 'Accenture', 'Deloitte'],
        careerPathDetails: {
          description: 'Requires significant experience; usually progresses from engineer to architect roles',
          nextRoles: ['Principal Architect', 'VP Engineering'],
          growthOpportunities: ['Enterprise Architecture', 'Solutions Architecture']
        }
      },
      {
        title: 'UI/UX Designer',
        description: 'Create user interfaces and design user experiences',
        industry: 'Technology',
        experience_level: 'entry',
        requiredSkills: [
          { name: 'UI Design', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'UX Principles', level: 'intermediate', importance: 'critical', alternatives: [] },
          { name: 'Figma', level: 'intermediate', importance: 'high', alternatives: ['Adobe XD', 'Sketch'] },
          { name: 'Prototyping', level: 'intermediate', importance: 'high', alternatives: [] },
          { name: 'User Research', level: 'intermediate', importance: 'high', alternatives: [] }
        ],
        niceToHaveSkills: [
          { name: 'Interaction Design', level: 'intermediate' },
          { name: 'Motion Design', level: 'beginner' },
          { name: 'Front-end Knowledge', level: 'beginner' }
        ],
        averageSalary: 500000,
        jobMarketDemand: 'high',
        futureRelevance: 'stable',
        typicalCompanies: ['Google', 'Apple', 'Meta', 'Figma', 'Design Studios'],
        careerPathDetails: {
          description: 'Progress from junior designer to senior/lead designer roles',
          nextRoles: ['Senior Designer', 'Design Lead', 'Design Manager'],
          growthOpportunities: ['Product Management', 'Design Leadership', 'Research']
        }
      }
    ];

    await CareerRole.insertMany(careerRoles);
    console.log('✅ Career Roles seeded');

    console.log('✅ Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding database:', err);
    process.exit(1);
  }
};

seedDatabase();
