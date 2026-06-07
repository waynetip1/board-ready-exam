// Multi-license exam routing — maps a PassBoard license type to its question
// engine, PSI topic proportions, and brand theme.
import {
  buildFullExam as buildCosmoExam,
  buildPreTest as buildCosmoPreTest,
  buildTopicTest as buildCosmoTopicTest,
  TOPIC_PROPORTIONS as COSMO_TOPIC_PROPORTIONS,
  TOPICS as COSMO_TOPICS,
  MAX_FULL_EXAMS as COSMO_MAX_FULL_EXAMS,
  MAX_TOPIC_EXAMS as COSMO_MAX_TOPIC_EXAMS,
  getAdaptiveReinforcement as getCosmoAdaptiveReinforcement,
} from './examEngine.js'
import {
  buildBarberExam,
  buildBarberPreTest,
  buildBarberTopicTest,
  BARBER_TOPIC_PROPORTIONS,
  BARBER_TOPICS,
  BARBER_MAX_TOPIC_EXAMS,
  getBarberAdaptiveReinforcement,
} from './barberExamEngine.js'
import {
  buildEsthiExam as buildEstheticianExam,
  buildEsthiPreTest as buildEstheticianPreTest,
  buildEsthiTopicTest as buildEstheticianTopicTest,
  ESTHI_TOPIC_PROPORTIONS as ESTHETICIAN_TOPIC_PROPORTIONS,
  ESTHI_TOPICS as ESTHETICIAN_TOPICS,
  ESTHI_MAX_TOPIC_EXAMS as ESTHETICIAN_MAX_TOPIC_EXAMS,
  getEsthiAdaptiveReinforcement as getEstheticianAdaptiveReinforcement,
} from './esthiExamEngine.js'
import {
  buildNailsExam,
  buildNailsPreTest,
  buildNailsTopicTest,
  NAILS_TOPIC_PROPORTIONS,
  NAILS_TOPICS,
  NAILS_MAX_TOPIC_EXAMS,
  getNailsAdaptiveReinforcement,
} from './nailsExamEngine.js'

// Barber/esthetician/nails engines don't define their own full-exam cap —
// reuse the cosmetology cap as the shared default for all license types.
const SHARED_MAX_FULL_EXAMS = COSMO_MAX_FULL_EXAMS

// CSS variable palettes per license — consumed by themeLoader.js
export const LICENSE_THEMES = {
  cosmetology: {
    primary:    '#C8185A', // BRB rose
    secondary:  '#C0506A', // BRB rose-light
    background: '#FDF6F8', // BRB rose-bg
    accent:     '#C49A2A', // BRB gold
  },
  barber: {
    primary:    '#1B2A4A', // deep navy
    secondary:  '#4A7FA5', // steel blue
    background: '#F5F5F0', // warm white
    accent:     '#C49A2A', // gold
  },
  esthetician: {
    primary:    '#C9717A', // dusty rose
    secondary:  '#9E5A6B', // mauve
    background: '#FDF0F2', // blush cream
    accent:     '#C49A2A', // gold
  },
  nails: {
    primary:    '#6B2D5E', // plum
    secondary:  '#A0306A', // berry
    background: '#E8D5F0', // soft lavender
    accent:     '#C49A2A', // gold
  },
}

// Accounts that bypass license type and can access all four exams
export const ADMIN_EMAILS = ['tonythumbs725@gmail.com', 'wayne.tipton@gmail.com']

export function getExamEngine(licenseType) {
  switch (licenseType) {
    case 'cosmetology':
      return {
        build: buildCosmoExam,
        buildPreTest: buildCosmoPreTest,
        buildTopicTest: buildCosmoTopicTest,
        proportions: COSMO_TOPIC_PROPORTIONS,
        topics: COSMO_TOPICS,
        maxFullExams: COSMO_MAX_FULL_EXAMS,
        maxTopicExams: COSMO_MAX_TOPIC_EXAMS,
        getAdaptiveReinforcement: getCosmoAdaptiveReinforcement,
        theme: LICENSE_THEMES.cosmetology,
      }
    case 'barber':
      return {
        build: buildBarberExam,
        buildPreTest: buildBarberPreTest,
        buildTopicTest: buildBarberTopicTest,
        proportions: BARBER_TOPIC_PROPORTIONS,
        topics: BARBER_TOPICS,
        maxFullExams: SHARED_MAX_FULL_EXAMS,
        maxTopicExams: BARBER_MAX_TOPIC_EXAMS,
        getAdaptiveReinforcement: getBarberAdaptiveReinforcement,
        theme: LICENSE_THEMES.barber,
      }
    case 'esthetician':
      return {
        build: buildEstheticianExam,
        buildPreTest: buildEstheticianPreTest,
        buildTopicTest: buildEstheticianTopicTest,
        proportions: ESTHETICIAN_TOPIC_PROPORTIONS,
        topics: ESTHETICIAN_TOPICS,
        maxFullExams: SHARED_MAX_FULL_EXAMS,
        maxTopicExams: ESTHETICIAN_MAX_TOPIC_EXAMS,
        getAdaptiveReinforcement: getEstheticianAdaptiveReinforcement,
        theme: LICENSE_THEMES.esthetician,
      }
    case 'nails':
      return {
        build: buildNailsExam,
        buildPreTest: buildNailsPreTest,
        buildTopicTest: buildNailsTopicTest,
        proportions: NAILS_TOPIC_PROPORTIONS,
        topics: NAILS_TOPICS,
        maxFullExams: SHARED_MAX_FULL_EXAMS,
        maxTopicExams: NAILS_MAX_TOPIC_EXAMS,
        getAdaptiveReinforcement: getNailsAdaptiveReinforcement,
        theme: LICENSE_THEMES.nails,
      }
    default:
      throw new Error(`Unknown license type: ${licenseType}`)
  }
}

export function getAdminExamEngines() {
  return ['cosmetology', 'barber', 'esthetician', 'nails'].map(getExamEngine)
}

export function getLicenseLabel(licenseType) {
  switch (licenseType) {
    case 'cosmetology': return 'Cosmetology Operator'
    case 'barber':      return 'Class A Barber'
    case 'esthetician': return 'Esthetician'
    case 'nails':       return 'Manicurist'
    default:            return licenseType
  }
}
