export type SubmissionInput = {
  inputOne: string;
  inputTwo: string;
  inputThree: string;
  image: File;
};

export async function submitForm({
  inputOne,
  inputTwo,
  inputThree,
  image,
}: SubmissionInput) {
  const formData = new FormData();

  formData.append("input_one", inputOne);
  formData.append("input_two", inputTwo);
  formData.append("input_three", inputThree);
  formData.append("image", image);

  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/api/submissions`,
    {
      method: "POST",
      body: formData,
    },
  );

  const responseText = await response.text();
  let result: { detail?: string; success?: boolean; submission_id?: string } = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        `Backend returned an invalid response (${response.status} ${response.statusText}).`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(result.detail || "Submission failed.");
  }

  return result;
}