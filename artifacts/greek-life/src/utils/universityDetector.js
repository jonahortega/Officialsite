// Auto-detect university from .edu email domain
export const detectUniversityFromEmail = (email) => {
  if (!email || !email.includes('@')) return null;
  
  const domain = email.toLowerCase().split('@')[1];
  
  // Map of email domains to university names
  const universityMap = {
    // Rutgers
    'rutgers.edu': 'Rutgers University',
    'scarletmail.rutgers.edu': 'Rutgers University',
    
    // Northeastern
    'northeastern.edu': 'Northeastern University',
    'husky.neu.edu': 'Northeastern University',
    
    // USC
    'usc.edu': 'University of Southern California',
    
    // Stockton
    'stockton.edu': 'Stockton University',
    'go.stockton.edu': 'Stockton University',
    
    // Syracuse
    'syracuse.edu': 'Syracuse University',
    'syr.edu': 'Syracuse University',
    
    // University of Miami
    'miami.edu': 'University of Miami (FL)',
    'umiami.edu': 'University of Miami (FL)',
    
    // Florida universities
    'ufl.edu': 'University of Florida',
    'ut.edu': 'University of Tampa',
    'mail.ut.edu': 'University of Tampa',
    'ucf.edu': 'University of Central Florida',
    'knights.ucf.edu': 'University of Central Florida',
    
    // Tennessee
    'utk.edu': 'University of Tennessee (Knoxville)',
    'vols.utk.edu': 'University of Tennessee (Knoxville)',
    
    // Alabama
    'ua.edu': 'University of Alabama',
    'crimson.ua.edu': 'University of Alabama',
    'auburn.edu': 'Auburn University',
    'tigermail.auburn.edu': 'Auburn University',
    
    // Tulane
    'tulane.edu': 'Tulane University',
    
    // Big Ten
    'osu.edu': 'Ohio State University',
    'buckeyemail.osu.edu': 'Ohio State University',
    'umich.edu': 'University of Michigan (Ann Arbor)',
    'msu.edu': 'Michigan State University',
    
    // TCNJ
    'tcnj.edu': 'The College of New Jersey',
    'student.tcnj.edu': 'The College of New Jersey',
  };
  
  return universityMap[domain] || null;
};

// Check if email is from a university
export const isUniversityEmail = (email) => {
  return email && email.toLowerCase().endsWith('.edu');
};

export const detectUniversityFromEmail = (email) => {
  if (!email || !email.includes('@')) return null;
  
  const domain = email.toLowerCase().split('@')[1];
  
  // Map of email domains to university names
  const universityMap = {
    // Rutgers
    'rutgers.edu': 'Rutgers University',
    'scarletmail.rutgers.edu': 'Rutgers University',
    
    // Northeastern
    'northeastern.edu': 'Northeastern University',
    'husky.neu.edu': 'Northeastern University',
    
    // USC
    'usc.edu': 'University of Southern California',
    
    // Stockton
    'stockton.edu': 'Stockton University',
    'go.stockton.edu': 'Stockton University',
    
    // Syracuse
    'syracuse.edu': 'Syracuse University',
    'syr.edu': 'Syracuse University',
    
    // University of Miami
    'miami.edu': 'University of Miami (FL)',
    'umiami.edu': 'University of Miami (FL)',
    
    // Florida universities
    'ufl.edu': 'University of Florida',
    'ut.edu': 'University of Tampa',
    'mail.ut.edu': 'University of Tampa',
    'ucf.edu': 'University of Central Florida',
    'knights.ucf.edu': 'University of Central Florida',
    
    // Tennessee
    'utk.edu': 'University of Tennessee (Knoxville)',
    'vols.utk.edu': 'University of Tennessee (Knoxville)',
    
    // Alabama
    'ua.edu': 'University of Alabama',
    'crimson.ua.edu': 'University of Alabama',
    'auburn.edu': 'Auburn University',
    'tigermail.auburn.edu': 'Auburn University',
    
    // Tulane
    'tulane.edu': 'Tulane University',
    
    // Big Ten
    'osu.edu': 'Ohio State University',
    'buckeyemail.osu.edu': 'Ohio State University',
    'umich.edu': 'University of Michigan (Ann Arbor)',
    'msu.edu': 'Michigan State University',
    
    // TCNJ
    'tcnj.edu': 'The College of New Jersey',
    'student.tcnj.edu': 'The College of New Jersey',
  };
  
  return universityMap[domain] || null;
};

// Check if email is from a university
export const isUniversityEmail = (email) => {
  return email && email.toLowerCase().endsWith('.edu');
};

















