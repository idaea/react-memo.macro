import React from "react";
import { memo } from "../../helpers/react-memo.macro";

const something = () => {
	memo();
	return <p>Sample text</p>;
};
