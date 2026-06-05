const testRegex = () => {
  const paths = [
    'uploads/students/file.png',
    'C:\\path\\uploads\\file.png',
    'C:\\path\\uploads\\students\\file.png',
    'uploads\\students\\file.png'
  ];
  
  // Solution: Also match optional subdirectory like 'students'
  const r1 = /^(?:.*[\\/])?uploads[\\/][^\\/]*[\\/]/;
  
  paths.forEach(p => {
    const parts = p.split(/[\\/]/);
    const filename = parts[parts.length - 1];
    console.log('Input:', JSON.stringify(p));
    console.log('r1 result:', JSON.stringify(p.replace(r1, 'uploads/')));
    console.log('Filename:', filename);
    console.log('---');
  });
};

testRegex();