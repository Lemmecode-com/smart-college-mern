const StudentFee = require("../../src/models/studentFee.model");

describe("StudentFee Model Schema Indexes (#565)", () => {
  it("defines compound unique index on { college_id: 1, student_id: 1, course_id: 1 }", () => {
    const indexes = StudentFee.schema.indexes();
    const uniqueIndex = indexes.find(
      ([fields, options]) =>
        fields.college_id === 1 &&
        fields.student_id === 1 &&
        fields.course_id === 1 &&
        options?.unique === true
    );

    expect(uniqueIndex).toBeDefined();
    expect(uniqueIndex[0]).toEqual({
      college_id: 1,
      student_id: 1,
      course_id: 1,
    });
    expect(uniqueIndex[1].unique).toBe(true);
    expect(uniqueIndex[1].name).toBe("college_1_student_1_course_1_unique");
    expect(uniqueIndex[1].background).toBe(true);
  });
});

