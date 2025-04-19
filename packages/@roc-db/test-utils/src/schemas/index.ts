import { BlockImageSchema } from "./BlockImageSchema"
import { BlockParagraphSchema } from "./BlockParagraphSchema"
import { BlockTitleSchema } from "./BlockTitleSchema"
import { DraftSchema } from "./DraftSchema"
import { PostSchema } from "./PostSchema"
export {
    BlockImageSchema,
    BlockParagraphSchema,
    BlockTitleSchema,
    DraftSchema,
    PostSchema,
}

// Ref Schemas
export { DraftRefSchema } from "./DraftRefSchema"
export { PostRefSchema } from "./PostRefSchema"
export { UserRefSchema } from "./UserRefSchema"

// Mutation Schemas
export { CreatePostMutationSchema } from "./CreatePostMutationSchema"
export { CreateUserMutationSchema } from "./CreateUserMutationSchema"
export { UpdatePostMutationSchema } from "./UpdatePostMutationSchema"
export { UpdatePostTitleMutationSchema } from "./UpdatePostTitleMutationSchema"
