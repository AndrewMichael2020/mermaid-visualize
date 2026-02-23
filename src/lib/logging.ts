export const logUserActivity = async (userId: string | undefined, action: string, details?: any) => {
  const uid = userId || 'anonymous';
  if (details !== undefined) {
    console.log(`[activity] uid=${uid} action=${action}`, details);
  } else {
    console.log(`[activity] uid=${uid} action=${action}`);
  }
};
