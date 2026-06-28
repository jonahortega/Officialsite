# Organization Signup - Supabase Integration

## Update Required in OrganizationSignupScreen.js

Find the `handleSubmit` function (around line 104-140) and replace it with:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Check if terms are agreed to
  if (!agreedToTerms) {
    setShowTermsModal(true);
    return;
  }
  
  // Mark all fields as touched
  const allTouched = Object.keys(formData).reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
  setTouched(allTouched);

  // Validate all fields
  const newErrors = {};
  Object.keys(formData).forEach(key => {
    const error = validateField(key, formData[key]);
    if (error) newErrors[key] = error;
  });

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    setIsLoading(true);
    
    try {
      // Sign up organization with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            organization_name: formData.organizationName,
            username: formData.username,
            university: formData.university,
            is_organization: true
          }
        }
      });

      if (authError) {
        console.error('❌ Supabase organization signup error:', authError);
        setErrors({ email: authError.message });
        setIsLoading(false);
        return;
      }

      console.log('✅ Supabase organization signup successful:', authData);

      // Check if email confirmation is required
      if (authData.user && !authData.session) {
        console.log('📧 Email confirmation required for organization');
        setShowEmailConfirmation(true);
        setIsLoading(false);
        return;
      }

      // Auto-detect university from .edu email
      const detectedUniversity = detectUniversityFromEmail(formData.email) || formData.university;

      // Create organization profile in both users and organizations tables
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: formData.email,
            username: formData.username,
            full_name: formData.organizationName,
            bio: `Official account for ${formData.organizationName}`,
            university: detectedUniversity,
            is_organization: true
          }
        ]);

      if (userError) {
        console.error('❌ User profile creation error:', userError);
      }

      const { error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: formData.organizationName,
            username: formData.username,
            email: formData.email,
            university: detectedUniversity,
            type: 'Organization',
            description: `Official account for ${formData.organizationName}`,
            user_id: authData.user.id,
            followers_count: 0,
            events_count: 0
          }
        ]);

      if (orgError) {
        console.error('❌ Organization profile creation error:', orgError);
      }

      setIsLoading(false);
      if (onContinue) {
        onContinue({ 
          ...formData, 
          userId: authData.user.id,
          university: detectedUniversity,
          isOrganization: true
        });
      }
    } catch (error) {
      console.error('❌ Organization signup error:', error);
      setErrors({ email: 'An error occurred during signup. Please try again.' });
      setIsLoading(false);
    }
  }
};
```

## Also Add Email Confirmation Modal

At the end of the component (before the closing `</div></div>`), add:

```javascript
{/* Email Confirmation Modal */}
{showEmailConfirmation && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  }}>
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      borderRadius: '20px',
      maxWidth: '500px',
      width: '100%',
      padding: '32px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
      textAlign: 'center'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        background: 'rgba(124, 58, 237, 0.2)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <Mail style={{ width: '32px', height: '32px', color: '#7c3aed' }} />
      </div>

      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '12px'
      }}>
        Check Your Email
      </h2>

      <p style={{
        color: '#c4b5fd',
        fontSize: '16px',
        marginBottom: '24px',
        lineHeight: '1.6'
      }}>
        We've sent a confirmation email to:<br />
        <strong style={{ color: 'white' }}>{formData.email}</strong>
      </p>

      <p style={{
        color: '#9ca3af',
        fontSize: '14px',
        marginBottom: '32px'
      }}>
        Click the link in the email to verify your organization account.
      </p>

      <button
        onClick={() => {
          setShowEmailConfirmation(false);
          if (onNavigate) {
            onNavigate('login');
          }
        }}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        Go to Login
      </button>
    </div>
  </div>
)}
```


## Update Required in OrganizationSignupScreen.js

Find the `handleSubmit` function (around line 104-140) and replace it with:

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Check if terms are agreed to
  if (!agreedToTerms) {
    setShowTermsModal(true);
    return;
  }
  
  // Mark all fields as touched
  const allTouched = Object.keys(formData).reduce((acc, key) => {
    acc[key] = true;
    return acc;
  }, {});
  setTouched(allTouched);

  // Validate all fields
  const newErrors = {};
  Object.keys(formData).forEach(key => {
    const error = validateField(key, formData[key]);
    if (error) newErrors[key] = error;
  });

  setErrors(newErrors);

  if (Object.keys(newErrors).length === 0) {
    setIsLoading(true);
    
    try {
      // Sign up organization with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            organization_name: formData.organizationName,
            username: formData.username,
            university: formData.university,
            is_organization: true
          }
        }
      });

      if (authError) {
        console.error('❌ Supabase organization signup error:', authError);
        setErrors({ email: authError.message });
        setIsLoading(false);
        return;
      }

      console.log('✅ Supabase organization signup successful:', authData);

      // Check if email confirmation is required
      if (authData.user && !authData.session) {
        console.log('📧 Email confirmation required for organization');
        setShowEmailConfirmation(true);
        setIsLoading(false);
        return;
      }

      // Auto-detect university from .edu email
      const detectedUniversity = detectUniversityFromEmail(formData.email) || formData.university;

      // Create organization profile in both users and organizations tables
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: formData.email,
            username: formData.username,
            full_name: formData.organizationName,
            bio: `Official account for ${formData.organizationName}`,
            university: detectedUniversity,
            is_organization: true
          }
        ]);

      if (userError) {
        console.error('❌ User profile creation error:', userError);
      }

      const { error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: formData.organizationName,
            username: formData.username,
            email: formData.email,
            university: detectedUniversity,
            type: 'Organization',
            description: `Official account for ${formData.organizationName}`,
            user_id: authData.user.id,
            followers_count: 0,
            events_count: 0
          }
        ]);

      if (orgError) {
        console.error('❌ Organization profile creation error:', orgError);
      }

      setIsLoading(false);
      if (onContinue) {
        onContinue({ 
          ...formData, 
          userId: authData.user.id,
          university: detectedUniversity,
          isOrganization: true
        });
      }
    } catch (error) {
      console.error('❌ Organization signup error:', error);
      setErrors({ email: 'An error occurred during signup. Please try again.' });
      setIsLoading(false);
    }
  }
};
```

## Also Add Email Confirmation Modal

At the end of the component (before the closing `</div></div>`), add:

```javascript
{/* Email Confirmation Modal */}
{showEmailConfirmation && (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  }}>
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
      borderRadius: '20px',
      maxWidth: '500px',
      width: '100%',
      padding: '32px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
      textAlign: 'center'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        background: 'rgba(124, 58, 237, 0.2)',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px'
      }}>
        <Mail style={{ width: '32px', height: '32px', color: '#7c3aed' }} />
      </div>

      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '12px'
      }}>
        Check Your Email
      </h2>

      <p style={{
        color: '#c4b5fd',
        fontSize: '16px',
        marginBottom: '24px',
        lineHeight: '1.6'
      }}>
        We've sent a confirmation email to:<br />
        <strong style={{ color: 'white' }}>{formData.email}</strong>
      </p>

      <p style={{
        color: '#9ca3af',
        fontSize: '14px',
        marginBottom: '32px'
      }}>
        Click the link in the email to verify your organization account.
      </p>

      <button
        onClick={() => {
          setShowEmailConfirmation(false);
          if (onNavigate) {
            onNavigate('login');
          }
        }}
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        Go to Login
      </button>
    </div>
  </div>
)}
```

















