
module.exports = {
  collectCoverage: true,
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
    '^@/ai/(.*)$': '<rootDir>/src/ai/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/app/(.*)$': '<rootDir>/src/app/$1',
    '\\.(png|jpg|jpeg|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
    '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js'
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(lucide-react)/)'
  ]
};
