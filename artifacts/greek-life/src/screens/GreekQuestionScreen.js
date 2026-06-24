import React, { useState } from 'react';
import './GreekQuestionScreen.css';
import { getCollegeOrganizations } from '../data/collegesData';
import { Users, UserCheck, Search, Calendar, Check, ArrowRight } from 'lucide-react';

const GreekQuestionScreen = ({ user, onAnswer, onBack }) => {
  const [showGreekSelection, setShowGreekSelection] = useState(false);
  const [selectedGreek, setSelectedGreek] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  
  // State for the new organization selection - moved outside conditional
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [imageErrors, setImageErrors] = useState({});
  const [selectedOption, setSelectedOption] = useState(null);

  // Comprehensive image mapping for Greek organizations with party/frat themes
  const getGreekImage = (organizationName) => {
    const greekImages = {
      // Fraternities - Party & Brotherhood Themes
      "Alpha Epsilon Pi": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Gamma Rho": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Kappa Lambda": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Phi Alpha": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Sigma Phi": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Tau Omega": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Beta Theta Pi": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Beta Upsilon Chi": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Chi Phi": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Chi": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Kappa Epsilon": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Tau Delta": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Upsilon": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Farmhouse": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Kappa Alpha Order": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Kappa Alpha Psi": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Kappa Sigma": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Lambda Chi Alpha": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Omega Psi Phi": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Phi Beta Sigma": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Phi Delta Theta": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Phi Gamma Delta": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Phi Kappa Psi": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Phi Kappa Tau": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Phi Sigma Kappa": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Pi Kappa Alpha": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Pi Kappa Phi": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Alpha Epsilon": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Chi": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Nu": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Pi": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Tau Gamma": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Tau Kappa Epsilon": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Theta Chi": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Theta Xi": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Zeta Beta Tau": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Zeta Psi": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      
      // Sororities - Sisterhood & Social Themes
      "Alpha Chi Omega": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Delta Pi": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Gamma Delta": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Kappa Alpha": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Omicron Pi": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Phi": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Alpha Xi Delta": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Chi Omega": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Delta Delta": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Gamma": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Sigma Theta": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Delta Zeta": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Gamma Phi Beta": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Kappa Alpha Theta": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Kappa Delta": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Kappa Kappa Gamma": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Phi Mu": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
      "Pi Beta Phi": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Kappa": "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Sigma Sigma": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
      "Zeta Phi Beta": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80",
      "Zeta Tau Alpha": "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
      "Sigma Gamma Rho": "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80"
    };
    
    // Extract the base name without Greek letters for matching
    const baseName = organizationName.split(' - ')[0];
    return greekImages[baseName] || "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop&crop=center&q=80";
  };

  // University-specific Greek organizations database
  const universityGreekOrganizations = {
    // Default organizations (fallback)
    default: [
      {
        id: 1,
        name: "Chi Phi",
        type: "Fraternity",
        founded: 1824,
        description: "One of the oldest fraternities in the United States, focused on brotherhood, scholarship, and character development.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
        members: 45,
        isMember: false,
        colors: ["#1e3a8a", "#3b82f6"],
        motto: "Brotherhood, Scholarship, Character"
      },
      {
        id: 2,
        name: "Theta Chi",
        type: "Fraternity", 
        founded: 1856,
        description: "A brotherhood dedicated to developing leaders through academic excellence, community service, and lifelong friendships.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
        members: 52,
        isMember: false,
        colors: ["#dc2626", "#ef4444"],
        motto: "An Assisting Hand"
      },
      {
        id: 3,
        name: "Alpha Delta Pi",
        type: "Sorority",
        founded: 1851,
        description: "The first secret society for college women, promoting sisterhood, scholarship, and service to others.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
        members: 38,
        isMember: false,
        colors: ["#7c3aed", "#a855f7"],
        motto: "We Live for Each Other"
      },
      {
        id: 4,
        name: "Sigma Phi Epsilon",
        type: "Fraternity",
        founded: 1901,
        description: "Building balanced men through sound mind and sound body, emphasizing leadership and academic achievement.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
        members: 48,
        isMember: false,
        colors: ["#059669", "#10b981"],
        motto: "Building Balanced Men"
      },
      {
        id: 5,
        name: "Delta Gamma",
        type: "Sorority",
        founded: 1873,
        description: "Fostering high ideals of friendship, promoting educational and cultural interests, and creating a true sense of social responsibility.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
        members: 42,
        isMember: false,
        colors: ["#f59e0b", "#fbbf24"],
        motto: "Do Good"
      },
      {
        id: 6,
        name: "Kappa Alpha Order",
        type: "Fraternity",
        founded: 1865,
        description: "A brotherhood of gentlemen, scholars, and leaders committed to the highest ideals of character and achievement.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
        members: 55,
        isMember: false,
        colors: ["#dc2626", "#991b1b"],
        motto: "Dieu et les Dames"
      },
      {
        id: 7,
        name: "Alpha Kappa Alpha",
        type: "Sorority",
        founded: 1908,
        description: "The first African-American Greek-lettered sorority, promoting sisterhood, scholarship, and service to all mankind.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
        members: 48,
        isMember: false,
        colors: ["#7c3aed", "#a855f7"],
        motto: "By Culture and By Merit"
      },
      {
        id: 8,
        name: "Phi Beta Sigma",
        type: "Fraternity",
        founded: 1914,
        description: "A brotherhood of college men dedicated to the principles of brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
        members: 52,
        isMember: false,
        colors: ["#059669", "#10b981"],
        motto: "Culture for Service and Service for Humanity"
      },
      {
        id: 9,
        name: "Zeta Phi Beta",
        type: "Sorority",
        founded: 1920,
        description: "A community-conscious, action-oriented organization promoting scholarship, service, sisterly love, and finer womanhood.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
        members: 44,
        isMember: false,
        colors: ["#f59e0b", "#fbbf24"],
        motto: "A Community-Conscious, Action-Oriented Organization"
      },
      {
        id: 10,
        name: "Sigma Gamma Rho",
        type: "Sorority",
        founded: 1922,
        description: "An international collegiate sorority committed to enhancing the quality of life for women and their families.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
        members: 46,
        isMember: false,
        colors: ["#dc2626", "#991b1b"],
        motto: "Greater Service, Greater Progress"
      }
    ],
    
    // University of California, Berkeley
    "University of California, Berkeley": [
      {
        id: 101,
        name: "Alpha Epsilon Pi",
        type: "Fraternity",
        founded: 1913,
        description: "A Jewish fraternity focused on leadership development, academic excellence, and community service.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=300&fit=crop&crop=center&q=80",
        members: 65,
        isMember: false,
        colors: ["#1e40af", "#3b82f6"],
        motto: "The Jewish Fraternity"
      },
      {
        id: 102,
        name: "Delta Delta Delta",
        type: "Sorority",
        founded: 1888,
        description: "Promoting scholarship, leadership, and sisterhood while developing strong, confident women.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
        members: 58,
        isMember: false,
        colors: ["#7c3aed", "#a855f7"],
        motto: "Let Us Steadfastly Love One Another"
      },
      {
        id: 103,
        name: "Sigma Chi",
        type: "Fraternity",
        founded: 1855,
        description: "Building enduring friendships and developing character through leadership and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&crop=center&q=80",
        members: 72,
        isMember: false,
        colors: ["#dc2626", "#ef4444"],
        motto: "In Hoc Signo Vinces"
      },
      {
        id: 104,
        name: "Kappa Alpha Theta",
        type: "Sorority",
        founded: 1870,
        description: "Empowering women to be their authentic selves through leadership, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=300&fit=crop&crop=center&q=80",
        members: 61,
        isMember: false,
        colors: ["#059669", "#10b981"],
        motto: "Leading Women"
      },
      {
        id: 105,
        name: "Phi Delta Theta",
        type: "Fraternity",
        founded: 1848,
        description: "Building men of character through friendship, sound learning, and moral rectitude.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=center&q=80",
        members: 68,
        isMember: false,
        colors: ["#f59e0b", "#fbbf24"],
        motto: "One Man is No Man"
      },
      {
        id: 106,
        name: "Alpha Phi",
        type: "Sorority",
        founded: 1872,
        description: "Advancing women's lives through leadership, scholarship, and sisterhood.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=300&fit=crop&crop=center&q=80",
        members: 55,
        isMember: false,
        colors: ["#dc2626", "#991b1b"],
        motto: "Union Hand in Hand"
      }
    ],

    // Stanford University
    "Stanford University": [
      {
        id: 201,
        name: "Kappa Sigma",
        type: "Fraternity",
        founded: 1869,
        description: "A brotherhood of leaders, scholars, and gentlemen committed to excellence in all endeavors.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 45,
        isMember: false
      },
      {
        id: 202,
        name: "Pi Beta Phi",
        type: "Sorority",
        founded: 1867,
        description: "Promoting friendship, developing women of intellect and integrity, and cultivating leadership potential.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 52,
        isMember: false
      },
      {
        id: 203,
        name: "Delta Tau Delta",
        type: "Fraternity",
        founded: 1858,
        description: "Building character through leadership, scholarship, and brotherhood.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 48,
        isMember: false
      },
      {
        id: 204,
        name: "Gamma Phi Beta",
        type: "Sorority",
        founded: 1874,
        description: "Building confident women of character who celebrate sisterhood and make a difference in the world.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 49,
        isMember: false
      }
    ],

    // University of Michigan
    "University of Michigan": [
      {
        id: 301,
        name: "Alpha Tau Omega",
        type: "Fraternity",
        founded: 1865,
        description: "Developing leaders of character through brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 78,
        isMember: false
      },
      {
        id: 302,
        name: "Chi Omega",
        type: "Sorority",
        founded: 1895,
        description: "Fostering personal integrity, excellence in academic and intellectual pursuits, and intergenerational participation.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 85,
        isMember: false
      },
      {
        id: 303,
        name: "Sigma Alpha Epsilon",
        type: "Fraternity",
        founded: 1856,
        description: "Building gentlemen, scholars, and leaders through brotherhood and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 82,
        isMember: false
      },
      {
        id: 304,
        name: "Delta Zeta",
        type: "Sorority",
        founded: 1902,
        description: "Enriching the lives of our members through lifelong friendship, leadership, and service.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 76,
        isMember: false
      },
      {
        id: 305,
        name: "Phi Gamma Delta",
        type: "Fraternity",
        founded: 1848,
        description: "Building men of character through friendship, knowledge, service, morality, and excellence.",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=200&fit=crop",
        members: 71,
        isMember: false
      }
    ],

    // University of Texas at Austin
    "University of Texas at Austin": [
      {
        id: 401,
        name: "Beta Theta Pi",
        type: "Fraternity",
        founded: 1839,
        description: "Developing men of principle for a principled life through brotherhood, scholarship, and leadership.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 89,
        isMember: false
      },
      {
        id: 402,
        name: "Alpha Chi Omega",
        type: "Sorority",
        founded: 1885,
        description: "Empowering women to realize their potential while advancing the understanding of women's history.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 92,
        isMember: false
      },
      {
        id: 403,
        name: "Lambda Chi Alpha",
        type: "Fraternity",
        founded: 1909,
        description: "Building leaders through brotherhood, scholarship, and service to others.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 76,
        isMember: false
      },
      {
        id: 404,
        name: "Kappa Kappa Gamma",
        type: "Sorority",
        founded: 1870,
        description: "Promoting scholarship, leadership, and friendship while developing women of character.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 88,
        isMember: false
      }
    ],

    // University of California, Los Angeles
    "University of California, Los Angeles": [
      {
        id: 501,
        name: "Alpha Gamma Rho",
        type: "Fraternity",
        founded: 1904,
        description: "Building men of character through brotherhood, scholarship, and leadership in agriculture.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 62,
        isMember: false
      },
      {
        id: 502,
        name: "Alpha Omicron Pi",
        type: "Sorority",
        founded: 1897,
        description: "Promoting friendship, developing women of intellect and integrity, and cultivating leadership potential.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 68,
        isMember: false
      },
      {
        id: 503,
        name: "Delta Sigma Phi",
        type: "Fraternity",
        founded: 1899,
        description: "Building better men through brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 55,
        isMember: false
      },
      {
        id: 504,
        name: "Zeta Tau Alpha",
        type: "Sorority",
        founded: 1898,
        description: "Making a difference in the lives of our members by developing the potential of each individual.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 71,
        isMember: false
      }
    ],

    // University of Southern California
    "University of Southern California": [
      {
        id: 601,
        name: "Alpha Delta Gamma",
        type: "Fraternity",
        founded: 1924,
        description: "Building men of character through brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 58,
        isMember: false
      },
      {
        id: 602,
        name: "Alpha Epsilon Phi",
        type: "Sorority",
        founded: 1909,
        description: "Empowering women to be their authentic selves through leadership, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 64,
        isMember: false
      },
      {
        id: 603,
        name: "Phi Kappa Psi",
        type: "Fraternity",
        founded: 1852,
        description: "Building men of character through brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 67,
        isMember: false
      },
      {
        id: 604,
        name: "Sigma Kappa",
        type: "Sorority",
        founded: 1874,
        description: "Promoting friendship, developing women of intellect and integrity, and cultivating leadership potential.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 59,
        isMember: false
      }
    ],

    // University of California, San Diego
    "University of California, San Diego": [
      {
        id: 701,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 45,
        isMember: false
      },
      {
        id: 702,
        name: "Delta Phi Epsilon",
        type: "Sorority",
        founded: 1917,
        description: "Promoting good fellowship among the women students, and developing in them high ideals of friendship.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 52,
        isMember: false
      },
      {
        id: 703,
        name: "Pi Kappa Alpha",
        type: "Fraternity",
        founded: 1868,
        description: "Building men of integrity, intellect, and high moral character.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 48,
        isMember: false
      }
    ],

    // University of California, Davis
    "University of California, Davis": [
      {
        id: 801,
        name: "Alpha Gamma Sigma",
        type: "Fraternity",
        founded: 1923,
        description: "Promoting scholarship, leadership, and brotherhood among agricultural students.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 42,
        isMember: false
      },
      {
        id: 802,
        name: "Alpha Xi Delta",
        type: "Sorority",
        founded: 1893,
        description: "Inspiring women to realize their potential through the power of sisterhood.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 56,
        isMember: false
      },
      {
        id: 803,
        name: "Sigma Nu",
        type: "Fraternity",
        founded: 1869,
        description: "Building men of character through brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 51,
        isMember: false
      }
    ],

    // University of California, Irvine
    "University of California, Irvine": [
      {
        id: 901,
        name: "Alpha Phi Alpha",
        type: "Fraternity",
        founded: 1906,
        description: "Developing leaders, promoting brotherhood and academic excellence, while providing service and advocacy.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 38,
        isMember: false
      },
      {
        id: 902,
        name: "Delta Sigma Theta",
        type: "Sorority",
        founded: 1913,
        description: "Promoting academic excellence and providing assistance to persons in need through public service.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 44,
        isMember: false
      },
      {
        id: 903,
        name: "Kappa Alpha Psi",
        type: "Fraternity",
        founded: 1911,
        description: "Achievement in every field of human endeavor through brotherhood and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 41,
        isMember: false
      }
    ],

    // University of California, Santa Barbara
    "University of California, Santa Barbara": [
      {
        id: 1001,
        name: "Alpha Kappa Psi",
        type: "Fraternity",
        founded: 1904,
        description: "Developing principled business leaders through brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 47,
        isMember: false
      },
      {
        id: 1002,
        name: "Alpha Sigma Alpha",
        type: "Sorority",
        founded: 1901,
        description: "Promoting friendship, developing women of intellect and integrity, and cultivating leadership potential.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 53,
        isMember: false
      },
      {
        id: 1003,
        name: "Phi Sigma Kappa",
        type: "Fraternity",
        founded: 1873,
        description: "Building men of character through brotherhood, scholarship, and service.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 49,
        isMember: false
      }
    ],

    // University of California, Santa Cruz
    "University of California, Santa Cruz": [
      {
        id: 1101,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 35,
        isMember: false
      },
      {
        id: 1102,
        name: "Gamma Phi Beta",
        type: "Sorority",
        founded: 1874,
        description: "Building confident women of character who celebrate sisterhood and make a difference in the world.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 41,
        isMember: false
      }
    ],

    // University of California, Riverside
    "University of California, Riverside": [
      {
        id: 1201,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 33,
        isMember: false
      },
      {
        id: 1202,
        name: "Delta Gamma",
        type: "Sorority",
        founded: 1873,
        description: "Fostering high ideals of friendship, promoting educational and cultural interests, and creating a true sense of social responsibility.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 39,
        isMember: false
      }
    ],

    // University of California, Merced
    "University of California, Merced": [
      {
        id: 1301,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 28,
        isMember: false
      }
    ],

    // California State University, Long Beach
    "California State University, Long Beach": [
      {
        id: 1401,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 52,
        isMember: false
      },
      {
        id: 1402,
        name: "Delta Zeta",
        type: "Sorority",
        founded: 1902,
        description: "Enriching the lives of our members through lifelong friendship, leadership, and service.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 58,
        isMember: false
      }
    ],

    // California State University, Fullerton
    "California State University, Fullerton": [
      {
        id: 1501,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 48,
        isMember: false
      },
      {
        id: 1502,
        name: "Gamma Phi Beta",
        type: "Sorority",
        founded: 1874,
        description: "Building confident women of character who celebrate sisterhood and make a difference in the world.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 54,
        isMember: false
      }
    ],

    // California State University, Northridge
    "California State University, Northridge": [
      {
        id: 1601,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 45,
        isMember: false
      }
    ],

    // San Diego State University
    "San Diego State University": [
      {
        id: 1701,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 67,
        isMember: false
      },
      {
        id: 1702,
        name: "Delta Gamma",
        type: "Sorority",
        founded: 1873,
        description: "Fostering high ideals of friendship, promoting educational and cultural interests, and creating a true sense of social responsibility.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 73,
        isMember: false
      }
    ],

    // San Jose State University
    "San Jose State University": [
      {
        id: 1801,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 41,
        isMember: false
      }
    ],

    // California Polytechnic State University
    "California Polytechnic State University": [
      {
        id: 1901,
        name: "Alpha Gamma Rho",
        type: "Fraternity",
        founded: 1904,
        description: "Building men of character through brotherhood, scholarship, and leadership in agriculture.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 55,
        isMember: false
      },
      {
        id: 1902,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=200&fit=crop",
        members: 62,
        isMember: false
      }
    ],

    // University of San Francisco
    "University of San Francisco": [
      {
        id: 2001,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 38,
        isMember: false
      }
    ],

    // Santa Clara University
    "Santa Clara University": [
      {
        id: 2101,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 42,
        isMember: false
      },
      {
        id: 2102,
        name: "Delta Gamma",
        type: "Sorority",
        founded: 1873,
        description: "Fostering high ideals of friendship, promoting educational and cultural interests, and creating a true sense of social responsibility.",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=200&fit=crop",
        members: 48,
        isMember: false
      }
    ],

    // Loyola Marymount University
    "Loyola Marymount University": [
      {
        id: 2201,
        name: "Alpha Phi Omega",
        type: "Fraternity",
        founded: 1925,
        description: "Building leaders through service to others, developing friendship, and promoting character.",
        image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400&h=200&fit=crop",
        members: 36,
        isMember: false
      },
      {
        id: 2202,
        name: "Gamma Phi Beta",
        type: "Sorority",
        founded: 1874,
        description: "Building confident women of character who celebrate sisterhood and make a difference in the world.",
        image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=200&fit=crop",
        members: 41,
        isMember: false
      }
    ]
  };

  // Get the appropriate Greek organizations based on the user's university
  const getGreekOrganizations = () => {
    const collegeData = getCollegeOrganizations(user?.university || '');
    
    // If no college data or no organizations, return defaults
    if (!collegeData.fraternities.length && !collegeData.sororities.length) {
      return universityGreekOrganizations.default;
    }

    // Generate fraternities from college data
    const fraternities = collegeData.fraternities.map((name, index) => ({
      id: `fraternity-${index + 1}`,
      name: name,
      type: "Fraternity",
      founded: 1800 + Math.floor(Math.random() * 200),
      description: `${name} - Building brotherhood, leadership, and character through Greek life.`,
      image: getGreekImage(name),
      members: Math.floor(Math.random() * 50) + 30,
      isMember: false,
      colors: ["#1e3a8a", "#3b82f6"],
      motto: "Brotherhood, Scholarship, Character"
    }));

    // Generate sororities from college data
    const sororities = collegeData.sororities.map((name, index) => ({
      id: `sorority-${index + 1}`,
      name: name,
      type: "Sorority",
      founded: 1800 + Math.floor(Math.random() * 200),
      description: `${name} - Empowering women through sisterhood, scholarship, and service.`,
      image: getGreekImage(name),
      members: Math.floor(Math.random() * 50) + 40,
      isMember: false,
      colors: ["#7c3aed", "#a855f7"],
      motto: "Sisterhood, Scholarship, Service"
    }));

    return [...fraternities, ...sororities];
  };

  const greekOrganizations = getGreekOrganizations();

  const handleGreekInvolved = () => {
    setShowGreekSelection(true);
  };

  const handleNotInvolved = () => {
    // Skip directly to home page by calling onAnswer with false
    onAnswer(false);
  };

  const handleGreekSelect = (greek) => {
    setSelectedGreek(greek);
    // Scroll to top to show selection summary
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJoinRequest = () => {
    setShowJoinModal(true);
  };

  const handleSubmitJoinRequest = () => {
    if (selectedGreek) {
      // In a real app, you'd send the join request to the server
      console.log('Join request sent for:', selectedGreek.name);
      
      // Create a simple user object with the Greek organization info
      const updatedUser = {
        name: user?.name || 'User',
        university: user?.university || 'University',
        greekOrganization: {
          id: selectedGreek.id,
          name: selectedGreek.name,
          type: selectedGreek.type,
          founded: selectedGreek.founded,
          description: selectedGreek.description,
          image: selectedGreek.image,
          members: selectedGreek.members
        },
        joinStatus: 'pending'
      };
      
      // Call onAnswer with the updated user data
      onAnswer(updatedUser);
    }
  };

  const handleCloseModal = () => {
    setShowJoinModal(false);
  };

  // Handle escape key to close modal
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showJoinModal) {
        handleCloseModal();
      }
    };

    if (showJoinModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showJoinModal]);

  const handleBackToSelection = () => {
    setShowGreekSelection(false);
    setSelectedGreek(null);
    setShowJoinModal(false);
    // Reset organization selection state
    setSelectedOrg(null);
    setSearchQuery("");
    setActiveTab("all");
  };



  const handleContinue = () => {
    if (selectedOption === 'member') {
      handleGreekInvolved();
    } else if (selectedOption === 'explorer') {
      handleNotInvolved();
    }
  };

  // Organization data from the provided code
  const organizations = [
    {
      id: "1",
      name: "Alpha Phi Alpha",
      type: "fraternity",
      initials: "ΑΦΑ",
      members: 245,
      founded: 1906,
      color: "from-yellow-500/20 to-black/20",
    },
    {
      id: "2",
      name: "Kappa Alpha Psi",
      type: "fraternity",
      initials: "ΚΑΨ",
      members: 198,
      founded: 1911,
      color: "from-red-500/20 to-white/20",
    },
    {
      id: "3",
      name: "Omega Psi Phi",
      type: "fraternity",
      initials: "ΩΨΦ",
      members: 223,
      founded: 1911,
      color: "from-purple-500/20 to-yellow-500/20",
    },
    {
      id: "4",
      name: "Phi Beta Sigma",
      type: "fraternity",
      initials: "ΦΒΣ",
      members: 187,
      founded: 1914,
      color: "from-blue-500/20 to-white/20",
    },
    {
      id: "5",
      name: "Alpha Kappa Alpha",
      type: "sorority",
      initials: "ΑΚΑ",
      members: 312,
      founded: 1908,
      color: "from-pink-500/20 to-green-500/20",
    },
    {
      id: "6",
      name: "Delta Sigma Theta",
      type: "sorority",
      initials: "ΔΣΘ",
      members: 289,
      founded: 1913,
      color: "from-red-500/20 to-red-700/20",
    },
    {
      id: "7",
      name: "Zeta Phi Beta",
      type: "sorority",
      initials: "ΖΦΒ",
      members: 267,
      founded: 1920,
      color: "from-blue-400/20 to-white/20",
    },
    {
      id: "8",
      name: "Sigma Gamma Rho",
      type: "sorority",
      initials: "ΣΓΡ",
      members: 234,
      founded: 1922,
      color: "from-yellow-500/20 to-blue-500/20",
    },
  ];

  // SelectionCard Component - exact from provided code
  const SelectionCard = ({ icon, title, description, isSelected, onClick, gradient, glowColor }) => {
    return (
      <button
        onClick={onClick}
        className={`group relative p-8 rounded-3xl backdrop-blur-xl border-2 bg-gradient-to-br shadow-2xl hover:shadow-2xl hover:scale-[1.02] hover:-translate-y-2 active:scale-95 transition-all duration-500 ease-out overflow-hidden w-full max-w-md ${
          isSelected
            ? 'from-emerald-900/40 to-emerald-900/20 border-emerald-500/60 hover:border-emerald-400/60'
            : `${gradient} border-white/20 hover:border-white/40`
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
        
        {isSelected && (
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-400/20 to-emerald-500/10 opacity-100 transition-opacity duration-500"></div>
        )}

        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className={`p-6 rounded-2xl bg-gradient-to-br backdrop-blur-sm transition-all duration-300 ${
            isSelected
              ? 'from-emerald-500/30 to-emerald-600/10 group-hover:from-emerald-400/40 group-hover:to-emerald-500/20'
              : `${glowColor} group-hover:scale-110`
          }`}>
            <div className={`w-16 h-16 flex items-center justify-center transition-all duration-300 ${
              isSelected ? 'text-emerald-400' : 'text-white'
            }`}>
              {icon}
            </div>
          </div>

          <div className="text-center space-y-3">
            <h3 className={`text-2xl font-bold transition-colors duration-300 ${
              isSelected ? 'text-emerald-400' : 'text-white'
            }`}>
              {title}
            </h3>
            <p className={`text-base transition-colors duration-300 ${
              isSelected ? 'text-emerald-300/80' : 'text-white/70'
            }`}>
              {description}
            </p>
          </div>

          {isSelected && (
            <div className="absolute top-4 right-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/30 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
          )}
        </div>
      </button>
    );
  };

  if (showGreekSelection) {
    const filteredOrganizations = organizations.filter((org) => {
      const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === "all" || org.type === activeTab;
      return matchesSearch && matchesTab;
    });

    const handleOrgSelect = (org) => {
      setSelectedOrg(org.id);
      setSelectedGreek(org); // Keep existing functionality
    };

    const handleContinue = () => {
      if (selectedOrg) {
        handleJoinRequest(); // Use existing join request flow
      }
    };

    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-0 transform -translate-x-1/2">
            <div className="w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
          </div>
          <div className="absolute bottom-1/4 right-0 transform translate-x-1/2">
            <div className="w-96 h-96 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-64 h-64 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
          </div>
        </div>

        {/* Grid Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>

        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
          {/* Header */}
          <div className="text-center mb-16 space-y-4">
            <div className="inline-flex items-center rounded-full bg-indigo-500/20 backdrop-blur-sm px-6 py-3 text-sm font-medium text-indigo-300 mb-6 border border-indigo-400/30">
              <Users className="w-4 h-4 mr-2" />
              Greek Life Community
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Select Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                Organization
              </span>
            </h1>
            
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Join a legacy of excellence and brotherhood/sisterhood
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 mx-auto max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-14 pl-12 pr-4 bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder:text-white/50 rounded-2xl focus:border-white/40 focus:ring-2 focus:ring-white/20 w-full"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="w-full max-w-md mx-auto grid grid-cols-3 bg-white/10 backdrop-blur-md border border-white/20 p-1 rounded-2xl">
              <button
                onClick={() => setActiveTab("all")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === "all" 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:text-white"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab("fraternity")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === "fraternity" 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:text-white"
                }`}
              >
                Fraternities
              </button>
              <button
                onClick={() => setActiveTab("sorority")}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === "sorority" 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:text-white"
                }`}
              >
                Sororities
              </button>
            </div>
          </div>

          {/* Organization Grid */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredOrganizations.map((org) => (
              <div
                key={org.id}
                onClick={() => handleOrgSelect(org)}
                className={`organization-card relative cursor-pointer rounded-2xl border-2 p-6 backdrop-blur-md transition-all duration-300 ${
                  selectedOrg === org.id
                    ? "border-white/40 bg-white/10 shadow-2xl shadow-white/20"
                    : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                }`}
              >
                <div 
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-50" 
                  style={{ backgroundImage: `linear-gradient(to bottom right, ${org.color})` }} 
                />
                
                <div className="relative z-10">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/20">
                      <span className="text-2xl font-bold text-white">{org.initials}</span>
                    </div>
                    
                    {selectedOrg === org.id && (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black">
                        <Check className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <h3 className="mb-3 text-xl font-bold text-white">{org.name}</h3>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Users className="h-4 w-4" />
                      <span>{org.members} Members</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Calendar className="h-4 w-4" />
                      <span>Founded {org.founded}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Continue Button */}
          {selectedOrg && (
            <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button
                onClick={handleContinue}
                className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300 border border-white/20"
              >
                Continue
                <svg
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  fill="none"
                  className="w-5 h-5 inline-block ml-2"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  ></path>
                </svg>
              </button>
            </div>
          )}

          {/* Back Button */}
          <div className="mt-8 text-center">
            <button 
              onClick={handleBackToSelection}
              className="px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-xl hover:bg-white/20 transition-all"
            >
              ← Back to Question
            </button>
          </div>
        </div>

        {/* Join Request Modal */}
        {showJoinModal && selectedGreek && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Request to Join {selectedGreek.name}</h2>
                <button className="modal-close" onClick={handleCloseModal}>×</button>
              </div>
              
              <div className="modal-body">
                <div className="modal-image">
                  <img 
                    src={getGreekImage(selectedGreek.name)} 
                    alt={selectedGreek.name}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="image-fallback" style={{ display: 'none' }}>
                    <span className="fallback-icon">🏛️</span>
                    <span className="fallback-text">{selectedGreek.name}</span>
                  </div>
                </div>
                
                <div className="modal-info">
                  <p className="modal-description">{selectedGreek.description}</p>
                  
                  <div className="modal-details">
                    <div className="modal-detail">
                      <strong>Type:</strong> {selectedGreek.type}
                    </div>
                    <div className="modal-detail">
                      <strong>Founded:</strong> {selectedGreek.founded}
                    </div>
                    <div className="modal-detail">
                      <strong>Members:</strong> {selectedGreek.members}
                    </div>
                  </div>

                  <div className="join-notice">
                    <h4>Join Request Process</h4>
                    <p>Your request will be reviewed by the organization's leadership. You'll be notified of the decision within 3-5 business days.</p>
                    <ul>
                      <li>Complete application form</li>
                      <li>Interview with current members</li>
                      <li>Review by leadership committee</li>
                      <li>Final decision notification</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={handleSubmitJoinRequest}>
                  Submit Request
                </button>
                <button className="btn btn-outline" onClick={handleCloseModal}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="greek-selection-screen">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 transform -translate-x-1/2">
          <div className="w-96 h-96 bg-gradient-to-br from-indigo-600/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        </div>
        <div className="absolute bottom-1/4 right-0 transform translate-x-1/2">
          <div className="w-96 h-96 bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-64 h-64 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 rounded-full blur-2xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>
      </div>

      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      ></div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center rounded-full bg-indigo-500/20 backdrop-blur-sm px-6 py-3 text-sm font-medium text-indigo-300 mb-6 border border-indigo-400/30">
            <Users className="w-4 h-4 mr-2" />
            Greek Life Community
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Join Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Community</span>
          </h1>
          
          <p className="text-xl text-white/70 max-w-2xl mx-auto">
            Select your current involvement status to get started with the perfect experience tailored for you
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl mx-auto justify-center items-center lg:items-stretch">
          <SelectionCard
            icon={<Users className="w-full h-full" />}
            title="I'm in a Greek organization"
            description="Connect with your chapter and access exclusive member benefits"
            isSelected={selectedOption === 'member'}
            onClick={() => setSelectedOption('member')}
            gradient="from-indigo-900/40 via-purple-900/40 to-indigo-900/40"
            glowColor="from-indigo-500/30 to-indigo-600/10 group-hover:from-indigo-400/40 group-hover:to-indigo-500/20"
          />

          <SelectionCard
            icon={<UserCheck className="w-full h-full" />}
            title="Not currently involved"
            description="Explore Greek life opportunities and discover the right fit for you"
            isSelected={selectedOption === 'explorer'}
            onClick={() => setSelectedOption('explorer')}
            gradient="from-purple-900/40 via-pink-900/40 to-purple-900/40"
            glowColor="from-purple-500/30 to-purple-600/10 group-hover:from-purple-400/40 group-hover:to-purple-500/20"
          />
        </div>

        {selectedOption && (
          <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button 
              onClick={handleContinue}
              className="px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-full shadow-2xl hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300 border border-white/20"
            >
              Continue
              <svg
                viewBox="0 0 24 24"
                stroke="currentColor"
                fill="none"
                className="w-5 h-5 inline-block ml-2"
              >
                <path
                  d="M9 5l7 7-7 7"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                ></path>
              </svg>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default GreekQuestionScreen; 