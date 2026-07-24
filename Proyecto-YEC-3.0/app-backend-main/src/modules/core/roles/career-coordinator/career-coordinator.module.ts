// career-coordinator.module.ts (el único que debería existir)
import { Global, Module } from '@nestjs/common';
import { CatalogueModule } from '@modules/common/catalogue/catalogue.module';
import { FileModule } from '@modules/common/file/file.module';
import { MailModule } from '@modules/common/mail/mail.module';
import { coreProviders } from '@modules/core/core.provider';
import { SharedCoreModule } from '@modules/core/shared-core/shared-core.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { controllers } from '@modules/core/roles/career-coordinator/controllers';
import { CareersService } from '@modules/core/roles/career-coordinator/services/careers.service';
import { TeacherDistributionsService } from '@modules/core/roles/career-coordinator/services/teacher-distributions.service';

@Global()
@Module({
  imports: [CatalogueModule, FileModule, MailModule, SharedCoreModule, ReportsModule],
  controllers,
  providers: [...coreProviders, TeacherDistributionsService, CareersService],
  exports: [],
})
export class CareerCoordinatorModule {}