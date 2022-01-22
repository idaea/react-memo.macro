import React from "react";
import { memo } from "../../helpers/react-memo.macro";

const TodoListOuter = function TodoListInner() {
	memo();
	return <p>Sample text</p>;
};
